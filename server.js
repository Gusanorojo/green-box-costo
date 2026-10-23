const fs = require("fs");
const http = require("http");
const path = require("path");
const { Pool } = require("pg");
const currency = require("./currency");

loadEnvFile();

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const WRITE_KEY = process.env.GREEN_BOX_WRITE_KEY || "";
const STATE_ID = "main";
const CURRENT_VERSION = 6;
const SUPPLY_UNITS = [
  "unidad",
  "metro",
  "centimetro",
  "gramo",
  "kilogramo",
  "paquete",
  "rollo",
  "otro",
];
const MONTHLY_CATEGORIES = [
  "Infraestructura",
  "Software",
  "Marketing",
  "Administracion",
  "Servicios",
  "Otros",
];
const PERIODICITIES = ["monthly", "annual"];
const PRICING_MODES = ["manual", "markup", "margin"];

const defaultState = {
  version: CURRENT_VERSION,
  components: [],
  printing: {
    filament: {
      name: "",
      spoolPrice: "",
      spoolWeightGrams: "",
    },
    pieces: [],
    wastePercent: "",
    electricityCostPerBox: "",
    legacyManualCost: "",
  },
  supplies: [],
  labor: [],
  packaging: [],
  adjustments: {
    wastePercent: "",
    warrantyPercent: "",
  },
  currencySettings: {
    displayCurrency: "ARS",
    usdArsRate: "",
    rateUpdatedAt: "",
  },
  monthlyCosts: [],
  purchaseItems: [],
  pricing: {
    mode: "manual",
    manualPrice: "",
    targetMarkupPercent: "",
    targetMarginPercent: "",
  },
  simulator: {
    quantity: 1,
  },
  legacyCosts: {
    caseCost: "",
    laborCost: "",
    otherCost: "",
  },
};

const staticFiles = new Map([
  ["/", "index.html"],
  ["/index.html", "index.html"],
  ["/styles.css", "styles.css"],
  ["/currency.js", "currency.js"],
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

function setSecurityHeaders(response) {
  response.setHeader(
    "Content-Security-Policy",
    "frame-ancestors 'self' https://www.notion.so https://notion.so https://*.notion.site",
  );
}

function sendJson(response, statusCode, payload) {
  setCorsHeaders(response);
  setSecurityHeaders(response);
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

  if (
    data.version === CURRENT_VERSION ||
    data.version === 2 ||
    data.printing ||
    data.supplies ||
    data.labor ||
    data.packaging ||
    data.monthlyCosts ||
    data.purchaseItems ||
    data.pricing ||
    data.adjustments
  ) {
    return normalizeVersionTwoState(data);
  }

  return migrateLegacyState(data);
}

function normalizeVersionTwoState(data) {
  return {
    version: CURRENT_VERSION,
    components: normalizeComponents(data.components),
    printing: {
      filament: {
        name: cleanString(data.printing?.filament?.name),
        spoolPrice: cleanString(data.printing?.filament?.spoolPrice),
        spoolWeightGrams: cleanString(data.printing?.filament?.spoolWeightGrams),
      },
      pieces: Array.isArray(data.printing?.pieces)
        ? data.printing.pieces.map((piece) => ({
            id: cleanString(piece.id) || cryptoSafeId("piece"),
            name: cleanString(piece.name),
            quantity: cleanString(piece.quantity),
            weightGrams: cleanString(piece.weightGrams),
            printHours: cleanString(piece.printHours ?? piece.print_hours ?? piece.hours),
          }))
        : [],
      wastePercent: cleanString(data.printing?.wastePercent),
      electricityCostPerBox: cleanString(data.printing?.electricityCostPerBox),
      legacyManualCost: cleanString(data.printing?.legacyManualCost),
    },
    supplies: Array.isArray(data.supplies)
      ? data.supplies.map((supply) => ({
          id: cleanString(supply.id) || cryptoSafeId("supply"),
          name: cleanString(supply.name),
          quantity: cleanString(supply.quantity),
          unit: SUPPLY_UNITS.includes(supply.unit) ? supply.unit : "unidad",
          unitPrice: cleanString(supply.unitPrice),
          supplier: cleanString(supply.supplier),
        }))
      : [],
    labor: Array.isArray(data.labor)
      ? data.labor.map((task) => ({
          id: cleanString(task.id) || cryptoSafeId("labor"),
          name: cleanString(task.name),
          hours: cleanString(task.hours),
          hourlyRate: cleanString(task.hourlyRate),
          responsible: cleanString(task.responsible),
        }))
      : [],
    packaging: Array.isArray(data.packaging)
      ? data.packaging.map((item) => ({
          id: cleanString(item.id) || cryptoSafeId("packaging"),
          name: cleanString(item.name),
          quantity: cleanString(item.quantity),
          unitPrice: cleanString(item.unitPrice),
          supplier: cleanString(item.supplier),
        }))
      : [],
    adjustments: {
      wastePercent: cleanString(data.adjustments?.wastePercent),
      warrantyPercent: cleanString(data.adjustments?.warrantyPercent),
    },
    currencySettings: {
      displayCurrency: currency.normalizeCurrency(data.currencySettings?.displayCurrency),
      usdArsRate: cleanString(data.currencySettings?.usdArsRate),
      rateUpdatedAt: cleanString(data.currencySettings?.rateUpdatedAt),
    },
    monthlyCosts: Array.isArray(data.monthlyCosts)
      ? data.monthlyCosts.map((cost) => ({
          id: cleanString(cost.id) || cryptoSafeId("monthly"),
          concept: cleanString(cost.concept),
          category: MONTHLY_CATEGORIES.includes(cost.category)
            ? cost.category
            : "Otros",
          amount: cleanString(cost.amount),
          currency: currency.normalizeCurrency(cost.currency),
          periodicity: PERIODICITIES.includes(cost.periodicity)
            ? cost.periodicity
            : "monthly",
        }))
      : [],
    purchaseItems: Array.isArray(data.purchaseItems)
      ? data.purchaseItems.map((item) => ({
          id: cleanString(item.id) || cryptoSafeId("purchase"),
          componentId: cleanString(item.componentId),
          sourceType: ["hardware", "supplies", "packaging", "filament"].includes(item.sourceType)
            ? item.sourceType
            : cleanString(item.componentId) ? "hardware" : "",
          sourceId: cleanString(item.sourceId || item.componentId),
          sourceCategory: cleanString(item.sourceCategory),
          name: cleanString(item.name),
          quantity: cleanString(item.quantity),
          unit: cleanString(item.unit),
          unitPrice: cleanString(item.unitPrice),
          currency: currency.normalizeCurrency(item.currency),
          supplier: cleanString(item.supplier),
        }))
      : [],
    pricing: {
      mode: PRICING_MODES.includes(data.pricing?.mode) ? data.pricing.mode : "manual",
      manualPrice: cleanString(data.pricing?.manualPrice),
      targetMarkupPercent: cleanString(data.pricing?.targetMarkupPercent),
      targetMarginPercent: cleanString(data.pricing?.targetMarginPercent),
    },
    simulator: {
      quantity: positiveNumber(data.simulator?.quantity) || 1,
    },
    legacyCosts: {
      caseCost: cleanString(data.legacyCosts?.caseCost),
      laborCost: cleanString(data.legacyCosts?.laborCost),
      otherCost: cleanString(data.legacyCosts?.otherCost),
    },
  };
}

function migrateLegacyState(data) {
  const migrated = normalizeVersionTwoState({
    version: CURRENT_VERSION,
    components: data.components,
    simulator: {
      quantity: data.productionQty,
    },
  });
  const caseCost = cleanString(data.costs?.caseCost);
  const laborCost = cleanString(data.costs?.laborCost);
  const otherCost = cleanString(data.costs?.otherCost);
  const margin = cleanString(data.margin);

  migrated.legacyCosts = {
    caseCost,
    laborCost,
    otherCost,
  };

  if (positiveNumber(caseCost) > 0) {
    migrated.printing.legacyManualCost = caseCost;
  }

  if (positiveNumber(laborCost) > 0) {
    migrated.labor.push({
      id: cryptoSafeId("labor"),
      name: "Mano de obra migrada",
      hours: "1",
      hourlyRate: laborCost,
      responsible: "",
    });
  }

  if (positiveNumber(otherCost) > 0) {
    migrated.supplies.push({
      id: cryptoSafeId("supply"),
      name: "Otros costos variables migrados",
      quantity: "1",
      unit: "otro",
      unitPrice: otherCost,
      supplier: "",
    });
  }

  if (margin !== "") {
    migrated.pricing.mode = "margin";
    migrated.pricing.targetMarginPercent = String(Math.min(positiveNumber(margin), 99.99));
  }

  return migrated;
}

function normalizeComponents(components) {
  return Array.isArray(components)
    ? components.map((component) => ({
        id: cleanString(component.id) || cryptoSafeId("component"),
        name: cleanString(component.name),
        quantity: cleanString(component.quantity),
        unitPrice: cleanString(component.unitPrice),
        supplier: cleanString(component.supplier),
      }))
    : [];
}

function cleanString(value) {
  return String(value ?? "").trim();
}

function positiveNumber(value) {
  const number = Number(cleanString(value).replace(",", "."));
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function cryptoSafeId(prefix = "record") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
      setSecurityHeaders(response);
      response.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
      });
      response.end("No encontrado");
      return;
    }

    setSecurityHeaders(response);
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

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`GREEN BOX escuchando en http://localhost:${PORT}`);
  });
}

module.exports = {
  normalizeState,
  normalizeVersionTwoState,
};
