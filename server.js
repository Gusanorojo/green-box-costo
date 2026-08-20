const fs = require("fs");
const http = require("http");
const path = require("path");
const { Pool } = require("pg");

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const WRITE_KEY = process.env.GREEN_BOX_WRITE_KEY || "";
const STATE_ID = "main";

const defaultState = {
  components: [],
  costs: {
    caseCost: "",
    laborCost: "",
    otherCost: "",
  },
  margin: "",
  productionQty: 1,
};

const staticFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/script.js", "script.js"],
  ["/green-box-data.json", "green-box-data.json"],
]);

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

let pool;
let schemaReady = false;

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      return;
    }

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  });
}

function getPool() {
  if (!DATABASE_URL) {
    throw new Error("Falta DATABASE_URL.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      connectionTimeoutMillis: 10_000,
      query_timeout: 15_000,
      ssl: {
        rejectUnauthorized: false,
      },
    });
  }

  return pool;
}

async function ensureSchema() {
  if (schemaReady) {
    return;
  }

  await getPool().query(`
    CREATE TABLE IF NOT EXISTS green_box_cost_state (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  schemaReady = true;
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, x-green-box-key",
  );
}

function sendJson(response, statusCode, payload) {
  setCorsHeaders(response);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error("El cuerpo de la solicitud es demasiado grande."));
      }
    });

    request.on("end", () => resolve(body));
    request.on("error", reject);
  });
}

function normalizeState(input) {
  const data = input?.data ?? input;

  if (!data || typeof data !== "object") {
    throw new Error("Estado invalido.");
  }

  return {
    components: Array.isArray(data.components)
      ? data.components.map((component) => ({
          id: String(component.id || cryptoSafeId()),
          name: String(component.name ?? "").trim(),
          quantity: String(component.quantity ?? ""),
          unitPrice: String(component.unitPrice ?? ""),
          supplier: String(component.supplier ?? "").trim(),
        }))
      : [],
    costs: {
      caseCost: String(data.costs?.caseCost ?? ""),
      laborCost: String(data.costs?.laborCost ?? ""),
      otherCost: String(data.costs?.otherCost ?? ""),
    },
    margin: String(data.margin ?? ""),
    productionQty: [1, 10, 25, 50, 100].includes(Number(data.productionQty))
      ? Number(data.productionQty)
      : 1,
  };
}

function cryptoSafeId() {
  return `component-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function canWrite(request) {
  if (!WRITE_KEY) {
    return true;
  }

  return request.headers["x-green-box-key"] === WRITE_KEY;
}

async function handleApi(request, response, pathname) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (pathname === "/api/health" && request.method === "GET") {
    sendJson(response, 200, {
      ok: true,
      databaseConfigured: Boolean(DATABASE_URL),
      writeKeyEnabled: Boolean(WRITE_KEY),
    });
    return;
  }

  if (pathname === "/api/state" && request.method === "GET") {
    await ensureSchema();

    const result = await getPool().query(
      "SELECT data, updated_at FROM green_box_cost_state WHERE id = $1",
      [STATE_ID],
    );
    const row = result.rows[0];

    sendJson(response, 200, {
      data: row?.data || defaultState,
      updatedAt: row?.updated_at || null,
    });
    return;
  }

  if (pathname === "/api/state" && request.method === "PUT") {
    if (!canWrite(request)) {
      sendJson(response, 401, {
        error: "Clave de edicion requerida.",
      });
      return;
    }

    const body = await readBody(request);
    const parsed = JSON.parse(body || "{}");
    const cleanState = normalizeState(parsed);

    await ensureSchema();

    const result = await getPool().query(
      `
        INSERT INTO green_box_cost_state (id, data, updated_at)
        VALUES ($1, $2::jsonb, NOW())
        ON CONFLICT (id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()
        RETURNING data, updated_at
      `,
      [STATE_ID, JSON.stringify(cleanState)],
    );

    sendJson(response, 200, {
      data: result.rows[0].data,
      updatedAt: result.rows[0].updated_at,
    });
    return;
  }

  sendJson(response, 404, {
    error: "Ruta de API no encontrada.",
  });
}

function serveStatic(request, response, pathname) {
  const fileName = staticFiles.get(pathname);

  if (!fileName) {
    response.writeHead(404, {
      "Content-Type": "text/plain; charset=utf-8",
    });
    response.end("No encontrado");
    return;
  }

  const filePath = path.join(__dirname, fileName);
  const extension = path.extname(fileName);

  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end("No encontrado");
      return;
    }

    response.writeHead(200, {
      "Content-Type": contentTypes[extension] || "application/octet-stream",
    });
    response.end(data);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);

  try {
    if (pathname.startsWith("/api/")) {
      await handleApi(request, response, pathname);
      return;
    }

    serveStatic(request, response, pathname);
  } catch (error) {
    sendJson(response, 500, {
      error: "Error del servidor.",
      detail: error.message,
    });
  }
});

server.listen(PORT, () => {
  console.log(`GREEN BOX escuchando en http://localhost:${PORT}`);
});
