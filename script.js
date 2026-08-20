const STORAGE_KEY = "greenBoxCostManager";
const PUBLIC_DATA_FILE = "green-box-data.json";
const API_BASE_URL = (globalThis.GREEN_BOX_API_URL || "").replace(/\/$/, "");

const state = {
  components: [],
  costs: {
    caseCost: "",
    laborCost: "",
    otherCost: "",
  },
  margin: "",
  productionQty: 1,
};

let storageMode = "local";
let cloudSaveTimer = null;
let cloudSaveInFlight = false;
let pendingCloudSave = false;
let editKey = localStorage.getItem("greenBoxWriteKey") || "";

const elements = {
  componentForm: document.querySelector("#componentForm"),
  componentId: document.querySelector("#componentId"),
  componentName: document.querySelector("#componentName"),
  componentQty: document.querySelector("#componentQty"),
  componentPrice: document.querySelector("#componentPrice"),
  componentSupplier: document.querySelector("#componentSupplier"),
  saveComponentBtn: document.querySelector("#saveComponentBtn"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  clearComponentsBtn: document.querySelector("#clearComponentsBtn"),
  exportBackupBtn: document.querySelector("#exportBackupBtn"),
  exportPublicDataBtn: document.querySelector("#exportPublicDataBtn"),
  importBackupBtn: document.querySelector("#importBackupBtn"),
  importBackupInput: document.querySelector("#importBackupInput"),
  backupStatus: document.querySelector("#backupStatus"),
  storageStatusText: document.querySelector("#storageStatusText"),
  componentsTableBody: document.querySelector("#componentsTableBody"),
  caseCost: document.querySelector("#caseCost"),
  laborCost: document.querySelector("#laborCost"),
  otherCost: document.querySelector("#otherCost"),
  marginRange: document.querySelector("#marginRange"),
  marginInput: document.querySelector("#marginInput"),
  productionQty: document.querySelector("#productionQty"),
  summaryUnitCost: document.querySelector("#summaryUnitCost"),
  summarySalePrice: document.querySelector("#summarySalePrice"),
  summaryProfit: document.querySelector("#summaryProfit"),
  summaryMargin: document.querySelector("#summaryMargin"),
  componentsTotal: document.querySelector("#componentsTotal"),
  manufacturingTotal: document.querySelector("#manufacturingTotal"),
  salePrice: document.querySelector("#salePrice"),
  unitProfit: document.querySelector("#unitProfit"),
  actualMargin: document.querySelector("#actualMargin"),
  requiredInvestment: document.querySelector("#requiredInvestment"),
  estimatedRevenue: document.querySelector("#estimatedRevenue"),
  estimatedProfit: document.querySelector("#estimatedProfit"),
};

const numberFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parseAmount(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function formatMoney(value) {
  return `$ ${numberFormatter.format(value || 0)}`;
}

function formatPercent(value) {
  return `${numberFormatter.format(value || 0)}%`;
}

function createId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `component-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function setStorageStatus(message, mode = storageMode) {
  elements.storageStatusText.textContent = message;
  document.body.classList.toggle("cloud-mode", mode === "cloud");
  document.body.classList.toggle("storage-error", mode === "error");
}

function setBackupStatus(message, isError = false) {
  elements.backupStatus.textContent = message;
  elements.backupStatus.classList.toggle("error", isError);
}

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function apiRequest(path, options = {}) {
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (editKey) {
    headers["x-green-box-key"] = editKey;
  }

  let response = await fetch(apiUrl(path), {
    ...options,
    headers,
  });

  if (response.status === 401 && options.method && options.method !== "GET") {
    const nextKey = window.prompt("Ingresa la clave de edicion");

    if (!nextKey) {
      throw new Error("Clave de edicion requerida.");
    }

    editKey = nextKey.trim();
    localStorage.setItem("greenBoxWriteKey", editKey);
    headers["x-green-box-key"] = editKey;

    response = await fetch(apiUrl(path), {
      ...options,
      headers,
    });
  }

  if (!response.ok) {
    if (response.status === 401) {
      editKey = "";
      localStorage.removeItem("greenBoxWriteKey");
    }

    throw new Error(`Error HTTP ${response.status}`);
  }

  return response.json();
}

function loadState() {
  try {
    const savedState = JSON.parse(localStorage.getItem(STORAGE_KEY));

    if (!savedState || typeof savedState !== "object") {
      return;
    }

    applyImportedState(normalizeImportedState(savedState));
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

  if (storageMode === "cloud") {
    scheduleCloudSave();
  }
}

function scheduleCloudSave() {
  setStorageStatus("Guardando en Neon...", "cloud");
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(saveStateToCloud, 650);
}

async function saveStateToCloud() {
  if (cloudSaveInFlight) {
    pendingCloudSave = true;
    return;
  }

  cloudSaveInFlight = true;

  try {
    await apiRequest("/api/state", {
      method: "PUT",
      body: JSON.stringify({ data: state }),
    });
    setStorageStatus("Guardado en Neon", "cloud");
    setBackupStatus("Datos guardados en Neon.");
  } catch {
    setStorageStatus("Error de guardado", "error");
    setBackupStatus("No se pudo guardar en Neon. Queda una copia local.", true);
  } finally {
    cloudSaveInFlight = false;

    if (pendingCloudSave) {
      pendingCloudSave = false;
      scheduleCloudSave();
    }
  }
}

async function connectCloudStorage() {
  if (window.location.protocol === "file:" && !API_BASE_URL) {
    setStorageStatus("Guardado local", "local");
    return;
  }

  setStorageStatus("Conectando a Neon...", "cloud");

  try {
    const response = await apiRequest("/api/state");
    applyImportedState(normalizeImportedState(response.data));
    storageMode = "cloud";
    render();
    setStorageStatus("Conectado a Neon", "cloud");
    setBackupStatus("Datos cargados desde Neon.");
  } catch {
    storageMode = "local";
    setStorageStatus("Guardado local", "local");
  }
}

function getBackupPayload() {
  return {
    app: "GREEN BOX",
    type: "green-box-cost-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    data: state,
  };
}

function downloadJson(payload, fileName) {
  const json = JSON.stringify(payload, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadBackup() {
  const date = new Date().toISOString().slice(0, 10);

  downloadJson(getBackupPayload(), `green-box-backup-${date}.json`);
  setBackupStatus("Backup exportado.");
}

function downloadPublicData() {
  downloadJson(
    {
      ...getBackupPayload(),
      type: "green-box-public-data",
      publishedAt: new Date().toISOString(),
    },
    PUBLIC_DATA_FILE,
  );
  setBackupStatus("Archivo para GitHub exportado.");
}

function normalizeImportedState(importedData) {
  const data = importedData?.data ?? importedData;

  if (!data || typeof data !== "object") {
    throw new Error("El archivo no tiene datos validos.");
  }

  return {
    components: Array.isArray(data.components)
      ? data.components.map((component) => ({
          id: component.id || createId(),
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

function applyImportedState(importedState) {
  state.components = importedState.components;
  state.costs = importedState.costs;
  state.margin = importedState.margin;
  state.productionQty = importedState.productionQty;
}

function importBackup(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      const importedState = normalizeImportedState(JSON.parse(reader.result));
      const shouldImport = window.confirm(
        "Importar este backup va a reemplazar los datos actuales. Continuar?",
      );

      if (!shouldImport) {
        setBackupStatus("Importacion cancelada.");
        return;
      }

      applyImportedState(importedState);
      resetComponentForm();
      saveState();
      render();
      setBackupStatus("Backup importado.");
    } catch {
      setBackupStatus("No se pudo importar el archivo.", true);
    } finally {
      elements.importBackupInput.value = "";
    }
  });

  reader.readAsText(file);
}

function componentCost(component) {
  return parseAmount(component.quantity) * parseAmount(component.unitPrice);
}

function calculateTotals() {
  const componentsTotal = state.components.reduce(
    (total, component) => total + componentCost(component),
    0,
  );
  const caseCost = parseAmount(state.costs.caseCost);
  const laborCost = parseAmount(state.costs.laborCost);
  const otherCost = parseAmount(state.costs.otherCost);
  const manufacturingTotal = componentsTotal + caseCost + laborCost + otherCost;
  const margin = Math.min(parseAmount(state.margin), 95);
  const salePrice =
    manufacturingTotal > 0 && margin < 100
      ? manufacturingTotal / (1 - margin / 100)
      : 0;
  const unitProfit = Math.max(salePrice - manufacturingTotal, 0);
  const actualMargin = salePrice > 0 ? (unitProfit / salePrice) * 100 : 0;
  const productionQty = Number.parseInt(state.productionQty, 10) || 1;

  return {
    componentsTotal,
    manufacturingTotal,
    margin,
    salePrice,
    unitProfit,
    actualMargin,
    productionQty,
    requiredInvestment: manufacturingTotal * productionQty,
    estimatedRevenue: salePrice * productionQty,
    estimatedProfit: unitProfit * productionQty,
  };
}

function syncInputs() {
  elements.caseCost.value = state.costs.caseCost;
  elements.laborCost.value = state.costs.laborCost;
  elements.otherCost.value = state.costs.otherCost;
  elements.marginInput.value = state.margin;
  elements.marginRange.value = state.margin === "" ? 0 : state.margin;
  elements.productionQty.value = String(state.productionQty);
}

function renderComponents() {
  if (state.components.length === 0) {
    elements.componentsTableBody.innerHTML =
      '<tr><td colspan="6" class="empty-row">Sin componentes cargados.</td></tr>';
    return;
  }

  elements.componentsTableBody.innerHTML = state.components
    .map(
      (component) => `
        <tr>
          <td>
            <div class="component-name">${escapeHtml(component.name)}</div>
          </td>
          <td>${numberFormatter.format(parseAmount(component.quantity))}</td>
          <td>${formatMoney(parseAmount(component.unitPrice))}</td>
          <td class="muted-text">${escapeHtml(component.supplier || "-")}</td>
          <td><strong>${formatMoney(componentCost(component))}</strong></td>
          <td>
            <div class="row-actions">
              <button class="icon-button" type="button" data-action="edit" data-id="${component.id}" aria-label="Editar ${escapeHtml(component.name)}">Editar</button>
              <button class="icon-button danger" type="button" data-action="delete" data-id="${component.id}" aria-label="Eliminar ${escapeHtml(component.name)}">Borrar</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderTotals() {
  const totals = calculateTotals();

  elements.summaryUnitCost.textContent = formatMoney(totals.manufacturingTotal);
  elements.summarySalePrice.textContent = formatMoney(totals.salePrice);
  elements.summaryProfit.textContent = formatMoney(totals.unitProfit);
  elements.summaryMargin.textContent = formatPercent(totals.actualMargin);
  elements.componentsTotal.textContent = formatMoney(totals.componentsTotal);
  elements.manufacturingTotal.textContent = formatMoney(totals.manufacturingTotal);
  elements.salePrice.textContent = formatMoney(totals.salePrice);
  elements.unitProfit.textContent = formatMoney(totals.unitProfit);
  elements.actualMargin.textContent = formatPercent(totals.actualMargin);
  elements.requiredInvestment.textContent = formatMoney(totals.requiredInvestment);
  elements.estimatedRevenue.textContent = formatMoney(totals.estimatedRevenue);
  elements.estimatedProfit.textContent = formatMoney(totals.estimatedProfit);
}

function render() {
  syncInputs();
  renderComponents();
  renderTotals();
}

function resetComponentForm() {
  elements.componentId.value = "";
  elements.componentName.value = "";
  elements.componentQty.value = "";
  elements.componentPrice.value = "";
  elements.componentSupplier.value = "";
  elements.saveComponentBtn.textContent = "Agregar componente";
  elements.cancelEditBtn.classList.add("hidden");
}

function upsertComponent(event) {
  event.preventDefault();

  const name = elements.componentName.value.trim();
  const quantity = elements.componentQty.value;
  const unitPrice = elements.componentPrice.value;
  const supplier = elements.componentSupplier.value.trim();

  if (!name) {
    elements.componentName.focus();
    return;
  }

  const component = {
    id: elements.componentId.value || createId(),
    name,
    quantity,
    unitPrice,
    supplier,
  };

  const existingIndex = state.components.findIndex(
    (item) => item.id === component.id,
  );

  if (existingIndex >= 0) {
    state.components[existingIndex] = component;
  } else {
    state.components.push(component);
  }

  resetComponentForm();
  saveState();
  render();
}

function editComponent(componentId) {
  const component = state.components.find((item) => item.id === componentId);

  if (!component) {
    return;
  }

  elements.componentId.value = component.id;
  elements.componentName.value = component.name;
  elements.componentQty.value = component.quantity;
  elements.componentPrice.value = component.unitPrice;
  elements.componentSupplier.value = component.supplier;
  elements.saveComponentBtn.textContent = "Guardar cambios";
  elements.cancelEditBtn.classList.remove("hidden");
  elements.componentName.focus();
}

function deleteComponent(componentId) {
  state.components = state.components.filter((component) => component.id !== componentId);
  saveState();
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  elements.componentForm.addEventListener("submit", upsertComponent);

  elements.cancelEditBtn.addEventListener("click", resetComponentForm);

  elements.exportBackupBtn.addEventListener("click", downloadBackup);

  elements.exportPublicDataBtn.addEventListener("click", downloadPublicData);

  elements.importBackupBtn.addEventListener("click", () => {
    elements.importBackupInput.click();
  });

  elements.importBackupInput.addEventListener("change", (event) => {
    importBackup(event.target.files[0]);
  });

  elements.clearComponentsBtn.addEventListener("click", () => {
    if (state.components.length === 0) {
      return;
    }

    const shouldClear = window.confirm("Eliminar todos los componentes cargados?");

    if (!shouldClear) {
      return;
    }

    state.components = [];
    resetComponentForm();
    saveState();
    render();
  });

  elements.componentsTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");

    if (!button) {
      return;
    }

    const { action, id } = button.dataset;

    if (action === "edit") {
      editComponent(id);
    }

    if (action === "delete") {
      deleteComponent(id);
    }
  });

  ["caseCost", "laborCost", "otherCost"].forEach((fieldName) => {
    elements[fieldName].addEventListener("input", (event) => {
      state.costs[fieldName] = event.target.value;
      saveState();
      renderTotals();
    });
  });

  elements.marginInput.addEventListener("input", (event) => {
    const value = event.target.value === "" ? "" : Math.min(parseAmount(event.target.value), 95);
    state.margin = value === "" ? "" : String(value);
    saveState();
    render();
  });

  elements.marginRange.addEventListener("input", (event) => {
    state.margin = event.target.value;
    saveState();
    render();
  });

  elements.productionQty.addEventListener("change", (event) => {
    state.productionQty = Number.parseInt(event.target.value, 10);
    saveState();
    renderTotals();
  });
}

loadState();
bindEvents();
render();
connectCloudStorage();
