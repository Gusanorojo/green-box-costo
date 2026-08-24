const STORAGE_KEY = "greenBoxCostManager";
const LEGACY_BACKUP_KEY = `${STORAGE_KEY}.legacyV1Backup`;
const PUBLIC_DATA_FILE = "green-box-data.json";
const API_BASE_URL = (globalThis.GREEN_BOX_API_URL || "").replace(/\/$/, "");
const CURRENT_VERSION = 2;

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

let state = createDefaultState();
let storageMode = "local";
let cloudSaveTimer = null;
let cloudSaveInFlight = false;
let pendingCloudSave = false;
let migrationNotice = "";
let editKey = readLocalStorage("greenBoxWriteKey") || "";

const elements = {
  storageStatusText: document.querySelector("#storageStatusText"),
  migrationStatus: document.querySelector("#migrationStatus"),

  tabButtons: Array.from(document.querySelectorAll(".tab-button")),
  appSections: Array.from(document.querySelectorAll(".app-section")),

  summaryUnitCost: document.querySelector("#summaryUnitCost"),
  summarySalePrice: document.querySelector("#summarySalePrice"),
  summaryProfit: document.querySelector("#summaryProfit"),
  summaryMargin: document.querySelector("#summaryMargin"),
  summaryFixedCosts: document.querySelector("#summaryFixedCosts"),
  summaryBreakEven: document.querySelector("#summaryBreakEven"),
  summaryContributionCard: document.querySelector("#summaryContributionCard"),
  summaryContributionLabel: document.querySelector("#summaryContributionLabel"),

  costBreakdownList: document.querySelector("#costBreakdownList"),
  directBaseCost: document.querySelector("#directBaseCost"),
  variableUnitCost: document.querySelector("#variableUnitCost"),

  componentForm: document.querySelector("#componentForm"),
  componentId: document.querySelector("#componentId"),
  componentName: document.querySelector("#componentName"),
  componentQty: document.querySelector("#componentQty"),
  componentPrice: document.querySelector("#componentPrice"),
  componentSupplier: document.querySelector("#componentSupplier"),
  componentFormMessage: document.querySelector("#componentFormMessage"),
  saveComponentBtn: document.querySelector("#saveComponentBtn"),
  cancelEditBtn: document.querySelector("#cancelEditBtn"),
  clearComponentsBtn: document.querySelector("#clearComponentsBtn"),
  componentsTableBody: document.querySelector("#componentsTableBody"),
  componentsTotal: document.querySelector("#componentsTotal"),

  filamentName: document.querySelector("#filamentName"),
  filamentSpoolPrice: document.querySelector("#filamentSpoolPrice"),
  filamentSpoolWeight: document.querySelector("#filamentSpoolWeight"),
  printingWastePercent: document.querySelector("#printingWastePercent"),
  printingConfigMessage: document.querySelector("#printingConfigMessage"),
  filamentPricePerGram: document.querySelector("#filamentPricePerGram"),
  printingTotalGrams: document.querySelector("#printingTotalGrams"),
  printingBaseCost: document.querySelector("#printingBaseCost"),
  printingWasteCost: document.querySelector("#printingWasteCost"),
  printingTotal: document.querySelector("#printingTotal"),
  printingPieceForm: document.querySelector("#printingPieceForm"),
  printingPieceId: document.querySelector("#printingPieceId"),
  printingPieceName: document.querySelector("#printingPieceName"),
  printingPieceQty: document.querySelector("#printingPieceQty"),
  printingPieceWeight: document.querySelector("#printingPieceWeight"),
  printingPieceFormMessage: document.querySelector("#printingPieceFormMessage"),
  savePrintingPieceBtn: document.querySelector("#savePrintingPieceBtn"),
  cancelPrintingPieceEditBtn: document.querySelector("#cancelPrintingPieceEditBtn"),
  printingPiecesTableBody: document.querySelector("#printingPiecesTableBody"),

  supplyForm: document.querySelector("#supplyForm"),
  supplyId: document.querySelector("#supplyId"),
  supplyName: document.querySelector("#supplyName"),
  supplyQty: document.querySelector("#supplyQty"),
  supplyUnit: document.querySelector("#supplyUnit"),
  supplyPrice: document.querySelector("#supplyPrice"),
  supplySupplier: document.querySelector("#supplySupplier"),
  supplyFormMessage: document.querySelector("#supplyFormMessage"),
  saveSupplyBtn: document.querySelector("#saveSupplyBtn"),
  cancelSupplyEditBtn: document.querySelector("#cancelSupplyEditBtn"),
  suppliesTableBody: document.querySelector("#suppliesTableBody"),
  suppliesTotal: document.querySelector("#suppliesTotal"),

  laborForm: document.querySelector("#laborForm"),
  laborId: document.querySelector("#laborId"),
  laborName: document.querySelector("#laborName"),
  laborHours: document.querySelector("#laborHours"),
  laborRate: document.querySelector("#laborRate"),
  laborResponsible: document.querySelector("#laborResponsible"),
  laborFormMessage: document.querySelector("#laborFormMessage"),
  saveLaborBtn: document.querySelector("#saveLaborBtn"),
  cancelLaborEditBtn: document.querySelector("#cancelLaborEditBtn"),
  laborTableBody: document.querySelector("#laborTableBody"),
  laborHoursTotal: document.querySelector("#laborHoursTotal"),
  laborTotal: document.querySelector("#laborTotal"),

  packagingForm: document.querySelector("#packagingForm"),
  packagingId: document.querySelector("#packagingId"),
  packagingName: document.querySelector("#packagingName"),
  packagingQty: document.querySelector("#packagingQty"),
  packagingPrice: document.querySelector("#packagingPrice"),
  packagingSupplier: document.querySelector("#packagingSupplier"),
  packagingFormMessage: document.querySelector("#packagingFormMessage"),
  savePackagingBtn: document.querySelector("#savePackagingBtn"),
  cancelPackagingEditBtn: document.querySelector("#cancelPackagingEditBtn"),
  packagingTableBody: document.querySelector("#packagingTableBody"),
  packagingTotal: document.querySelector("#packagingTotal"),

  generalWastePercent: document.querySelector("#generalWastePercent"),
  warrantyPercent: document.querySelector("#warrantyPercent"),
  adjustmentsMessage: document.querySelector("#adjustmentsMessage"),
  wasteBase: document.querySelector("#wasteBase"),
  wasteCost: document.querySelector("#wasteCost"),
  warrantyBase: document.querySelector("#warrantyBase"),
  warrantyReserve: document.querySelector("#warrantyReserve"),

  monthlyCostForm: document.querySelector("#monthlyCostForm"),
  monthlyCostId: document.querySelector("#monthlyCostId"),
  monthlyConcept: document.querySelector("#monthlyConcept"),
  monthlyCategory: document.querySelector("#monthlyCategory"),
  monthlyPeriodicity: document.querySelector("#monthlyPeriodicity"),
  monthlyAmount: document.querySelector("#monthlyAmount"),
  monthlyCostFormMessage: document.querySelector("#monthlyCostFormMessage"),
  saveMonthlyCostBtn: document.querySelector("#saveMonthlyCostBtn"),
  cancelMonthlyCostEditBtn: document.querySelector("#cancelMonthlyCostEditBtn"),
  monthlyCostsTableBody: document.querySelector("#monthlyCostsTableBody"),
  monthlyFixedCosts: document.querySelector("#monthlyFixedCosts"),

  pricingModeInputs: Array.from(document.querySelectorAll('input[name="pricingMode"]')),
  manualPriceGroup: document.querySelector("#manualPriceGroup"),
  markupGroup: document.querySelector("#markupGroup"),
  targetMarginGroup: document.querySelector("#targetMarginGroup"),
  manualSalePrice: document.querySelector("#manualSalePrice"),
  targetMarkupPercent: document.querySelector("#targetMarkupPercent"),
  targetMarginPercent: document.querySelector("#targetMarginPercent"),
  pricingMessage: document.querySelector("#pricingMessage"),
  pricingVariableCost: document.querySelector("#pricingVariableCost"),
  salePrice: document.querySelector("#salePrice"),
  unitProfit: document.querySelector("#unitProfit"),
  unitProfitLabel: document.querySelector("#unitProfitLabel"),
  actualMargin: document.querySelector("#actualMargin"),
  actualMarkup: document.querySelector("#actualMarkup"),

  simulatorQtyButtons: Array.from(document.querySelectorAll("[data-simulator-qty]")),
  productionQty: document.querySelector("#productionQty"),
  simulatorMessage: document.querySelector("#simulatorMessage"),
  simulatorUnits: document.querySelector("#simulatorUnits"),
  requiredInvestment: document.querySelector("#requiredInvestment"),
  simulatorVariableTotal: document.querySelector("#simulatorVariableTotal"),
  estimatedRevenue: document.querySelector("#estimatedRevenue"),
  estimatedContribution: document.querySelector("#estimatedContribution"),
  simulatorFixedCosts: document.querySelector("#simulatorFixedCosts"),
  estimatedProfit: document.querySelector("#estimatedProfit"),

  breakEvenUnits: document.querySelector("#breakEvenUnits"),
  breakEvenMessage: document.querySelector("#breakEvenMessage"),
  breakEvenFixedCosts: document.querySelector("#breakEvenFixedCosts"),
  breakEvenContribution: document.querySelector("#breakEvenContribution"),

  exportBackupBtn: document.querySelector("#exportBackupBtn"),
  exportPublicDataBtn: document.querySelector("#exportPublicDataBtn"),
  importBackupBtn: document.querySelector("#importBackupBtn"),
  importBackupInput: document.querySelector("#importBackupInput"),
  resetAllDataBtn: document.querySelector("#resetAllDataBtn"),
  backupStatus: document.querySelector("#backupStatus"),
};

const decimalFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const moneyNumberFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function createDefaultState() {
  return {
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
      legacyManualCost: "",
    },
    supplies: [],
    labor: [],
    packaging: [],
    adjustments: {
      wastePercent: "",
      warrantyPercent: "",
    },
    monthlyCosts: [],
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
}

function readLocalStorage(key) {
  try {
    return globalThis.localStorage?.getItem(key) || null;
  } catch (error) {
    console.warn(`No se pudo leer localStorage:${key}`, error);
    return null;
  }
}

function writeLocalStorage(key, value) {
  try {
    globalThis.localStorage?.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`No se pudo escribir localStorage:${key}`, error);
    setStorageStatus("Error de guardado", "error");
    return false;
  }
}

function removeLocalStorage(key) {
  try {
    globalThis.localStorage?.removeItem(key);
  } catch (error) {
    console.warn(`No se pudo borrar localStorage:${key}`, error);
  }
}

function parseJsonSafely(raw, sourceLabel) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`No se pudo interpretar JSON de ${sourceLabel}.`, error);
    return null;
  }
}

function toNumber(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value ?? "").trim();

  if (text === "") {
    return 0;
  }

  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : 0;
}

function nonNegativeNumber(value) {
  return Math.max(toNumber(value), 0);
}

function positiveQuantity(value) {
  const number = toNumber(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function percentNumber(value) {
  const number = nonNegativeNumber(value);
  return Math.min(number, 100);
}

function stringValue(value) {
  return String(value ?? "").trim();
}

function makeId(prefix = "record") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMoney(value) {
  const number = Number.isFinite(value) ? value : 0;
  const prefix = number < 0 ? "- " : "";
  return `${prefix}$ ${moneyNumberFormatter.format(Math.abs(number))}`;
}

function formatPercent(value) {
  if (!Number.isFinite(value)) {
    return "No calculable";
  }

  return `${percentFormatter.format(value)}%`;
}

function formatQuantity(value, suffix = "") {
  const number = Number.isFinite(value) ? value : 0;
  const unit = suffix ? ` ${suffix}` : "";
  return `${decimalFormatter.format(number)}${unit}`;
}

function formatPeriodicity(value) {
  return value === "annual" ? "anual" : "mensual";
}

function calculateRecordCost(record, quantityKey = "quantity", priceKey = "unitPrice") {
  return positiveQuantity(record?.[quantityKey]) * nonNegativeNumber(record?.[priceKey]);
}

function calculatePrintingPiece(piece, pricePerGram) {
  const quantity = positiveQuantity(piece?.quantity);
  const unitWeightGrams = positiveQuantity(piece?.weightGrams);
  const totalGrams = quantity * unitWeightGrams;

  return {
    totalGrams,
    baseCost: totalGrams * pricePerGram,
  };
}

function calculateMonthlyEquivalent(cost) {
  const amount = nonNegativeNumber(cost?.amount);
  return cost?.periodicity === "annual" ? amount / 12 : amount;
}

function calculateFinancialSummary(inputState = state) {
  const current = normalizeStateShape(inputState);
  const hardwareTotal = current.components.reduce(
    (total, component) => total + calculateRecordCost(component),
    0,
  );

  const spoolPrice = nonNegativeNumber(current.printing.filament.spoolPrice);
  const spoolWeight = positiveQuantity(current.printing.filament.spoolWeightGrams);
  const filamentPricePerGram = spoolWeight > 0 ? spoolPrice / spoolWeight : 0;
  const printingPieces = current.printing.pieces.map((piece) => {
    const result = calculatePrintingPiece(piece, filamentPricePerGram);
    return {
      ...piece,
      totalGrams: result.totalGrams,
      baseCost: result.baseCost,
    };
  });
  const printingPiecesBaseCost = printingPieces.reduce(
    (total, piece) => total + piece.baseCost,
    0,
  );
  const migratedPrintingCost = nonNegativeNumber(current.printing.legacyManualCost);
  const printingBaseCost = printingPiecesBaseCost + migratedPrintingCost;
  const printingWastePercent = percentNumber(current.printing.wastePercent);
  const printingWasteCost = (printingBaseCost * printingWastePercent) / 100;
  const printingTotal = printingBaseCost + printingWasteCost;
  const printingTotalGrams = printingPieces.reduce(
    (total, piece) => total + piece.totalGrams,
    0,
  );

  const suppliesTotal = current.supplies.reduce(
    (total, supply) => total + calculateRecordCost(supply),
    0,
  );
  const laborTotal = current.labor.reduce(
    (total, task) => total + calculateRecordCost(task, "hours", "hourlyRate"),
    0,
  );
  const laborHoursTotal = current.labor.reduce(
    (total, task) => total + positiveQuantity(task.hours),
    0,
  );
  const packagingTotal = current.packaging.reduce(
    (total, item) => total + calculateRecordCost(item),
    0,
  );

  const directBaseCost =
    hardwareTotal + printingTotal + suppliesTotal + laborTotal + packagingTotal;
  const wasteBase = hardwareTotal + suppliesTotal + packagingTotal;
  const wastePercent = percentNumber(current.adjustments.wastePercent);
  const wasteCost = (wasteBase * wastePercent) / 100;
  const warrantyBase = directBaseCost + wasteCost;
  const warrantyPercent = percentNumber(current.adjustments.warrantyPercent);
  const warrantyReserve = (warrantyBase * warrantyPercent) / 100;
  const variableUnitCost = directBaseCost + wasteCost + warrantyReserve;

  const monthlyFixedCosts = current.monthlyCosts.reduce(
    (total, cost) => total + calculateMonthlyEquivalent(cost),
    0,
  );

  const pricing = calculateSalePrice(current.pricing, variableUnitCost);
  const salePrice = pricing.salePrice;
  const contributionPerUnit = salePrice - variableUnitCost;
  const marginPercent = salePrice > 0 ? (contributionPerUnit / salePrice) * 100 : null;
  const markupPercent =
    variableUnitCost > 0 ? (contributionPerUnit / variableUnitCost) * 100 : null;

  const breakEven = calculateBreakEven(
    monthlyFixedCosts,
    salePrice,
    contributionPerUnit,
  );

  const simulatorQuantity = positiveQuantity(current.simulator.quantity) || 1;
  const investment = variableUnitCost * simulatorQuantity;
  const revenue = salePrice * simulatorQuantity;
  const contributionTotal = contributionPerUnit * simulatorQuantity;
  const estimatedResult = contributionTotal - monthlyFixedCosts;

  return {
    hardwareTotal,
    filamentPricePerGram,
    printingPieces,
    printingPiecesBaseCost,
    migratedPrintingCost,
    printingBaseCost,
    printingWastePercent,
    printingWasteCost,
    printingTotal,
    printingTotalGrams,
    suppliesTotal,
    laborHoursTotal,
    laborTotal,
    packagingTotal,
    directBaseCost,
    wasteBase,
    wastePercent,
    wasteCost,
    warrantyBase,
    warrantyPercent,
    warrantyReserve,
    variableUnitCost,
    monthlyFixedCosts,
    pricingMode: current.pricing.mode,
    pricingError: pricing.error,
    salePrice,
    contributionPerUnit,
    marginPercent,
    markupPercent,
    breakEvenUnits: breakEven.units,
    breakEvenMessage: breakEven.message,
    simulatorQuantity,
    requiredInvestment: investment,
    simulatorVariableTotal: investment,
    estimatedRevenue: revenue,
    estimatedContribution: contributionTotal,
    estimatedResult,
  };
}

function calculateSalePrice(pricing, variableUnitCost) {
  const mode = PRICING_MODES.includes(pricing?.mode) ? pricing.mode : "manual";

  if (mode === "markup") {
    const markup = nonNegativeNumber(pricing.targetMarkupPercent);
    return {
      salePrice: variableUnitCost > 0 ? variableUnitCost * (1 + markup / 100) : 0,
      error: "",
    };
  }

  if (mode === "margin") {
    const margin = nonNegativeNumber(pricing.targetMarginPercent);

    if (margin >= 100) {
      return {
        salePrice: 0,
        error: "El margen debe ser menor a 100%.",
      };
    }

    return {
      salePrice: variableUnitCost > 0 ? variableUnitCost / (1 - margin / 100) : 0,
      error: "",
    };
  }

  return {
    salePrice: nonNegativeNumber(pricing?.manualPrice),
    error: "",
  };
}

function calculateBreakEven(monthlyFixedCosts, salePrice, contributionPerUnit) {
  if (salePrice <= 0) {
    return {
      units: null,
      message:
        "No se puede calcular el punto de equilibrio porque el precio de venta es 0.",
    };
  }

  if (contributionPerUnit <= 0) {
    return {
      units: null,
      message:
        "No se puede calcular el punto de equilibrio porque la contribucion por unidad no es positiva.",
    };
  }

  if (monthlyFixedCosts <= 0) {
    return {
      units: null,
      message:
        "No se puede calcular el punto de equilibrio porque los costos fijos mensuales son 0.",
    };
  }

  const units = Math.ceil(monthlyFixedCosts / contributionPerUnit);

  return {
    units,
    message: `Necesitas vender aproximadamente ${units} Green Box por mes para cubrir los costos fijos actuales.`,
  };
}

function normalizeStateShape(inputState) {
  try {
    return normalizeImportedState(inputState);
  } catch (error) {
    console.warn("Estado invalido durante el calculo financiero.", error);
    return createDefaultState();
  }
}

function normalizeImportedState(importedData) {
  const data = importedData?.data ?? importedData;

  if (!data || typeof data !== "object") {
    throw new Error("El archivo no tiene datos validos.");
  }

  if (isVersionTwoState(data)) {
    return normalizeVersionTwoState(data);
  }

  if (Array.isArray(data.components) || data.costs || data.margin || data.productionQty) {
    return migrateLegacyState(data);
  }

  throw new Error("El archivo no tiene una estructura reconocible.");
}

function isVersionTwoState(data) {
  return (
    data.version === CURRENT_VERSION ||
    Boolean(data.printing) ||
    Boolean(data.supplies) ||
    Boolean(data.labor) ||
    Boolean(data.packaging) ||
    Boolean(data.monthlyCosts) ||
    Boolean(data.pricing) ||
    Boolean(data.adjustments)
  );
}

function normalizeVersionTwoState(data) {
  const base = createDefaultState();
  const pricingMode = PRICING_MODES.includes(data.pricing?.mode)
    ? data.pricing.mode
    : "manual";
  const supplyUnits = new Set(SUPPLY_UNITS);
  const monthlyCategories = new Set(MONTHLY_CATEGORIES);
  const periodicities = new Set(PERIODICITIES);

  return {
    ...base,
    version: CURRENT_VERSION,
    components: normalizeComponents(data.components),
    printing: {
      filament: {
        name: stringValue(data.printing?.filament?.name),
        spoolPrice: stringValue(data.printing?.filament?.spoolPrice),
        spoolWeightGrams: stringValue(data.printing?.filament?.spoolWeightGrams),
      },
      pieces: Array.isArray(data.printing?.pieces)
        ? data.printing.pieces.map((piece) => ({
            id: stringValue(piece.id) || makeId("piece"),
            name: stringValue(piece.name),
            quantity: stringValue(piece.quantity),
            weightGrams: stringValue(piece.weightGrams),
          }))
        : [],
      wastePercent: stringValue(data.printing?.wastePercent),
      legacyManualCost: stringValue(data.printing?.legacyManualCost),
    },
    supplies: Array.isArray(data.supplies)
      ? data.supplies.map((supply) => ({
          id: stringValue(supply.id) || makeId("supply"),
          name: stringValue(supply.name),
          quantity: stringValue(supply.quantity),
          unit: supplyUnits.has(supply.unit) ? supply.unit : "unidad",
          unitPrice: stringValue(supply.unitPrice),
          supplier: stringValue(supply.supplier),
        }))
      : [],
    labor: Array.isArray(data.labor)
      ? data.labor.map((task) => ({
          id: stringValue(task.id) || makeId("labor"),
          name: stringValue(task.name),
          hours: stringValue(task.hours),
          hourlyRate: stringValue(task.hourlyRate),
          responsible: stringValue(task.responsible),
        }))
      : [],
    packaging: Array.isArray(data.packaging)
      ? data.packaging.map((item) => ({
          id: stringValue(item.id) || makeId("packaging"),
          name: stringValue(item.name),
          quantity: stringValue(item.quantity),
          unitPrice: stringValue(item.unitPrice),
          supplier: stringValue(item.supplier),
        }))
      : [],
    adjustments: {
      wastePercent: stringValue(data.adjustments?.wastePercent),
      warrantyPercent: stringValue(data.adjustments?.warrantyPercent),
    },
    monthlyCosts: Array.isArray(data.monthlyCosts)
      ? data.monthlyCosts.map((cost) => ({
          id: stringValue(cost.id) || makeId("monthly"),
          concept: stringValue(cost.concept),
          category: monthlyCategories.has(cost.category) ? cost.category : "Otros",
          amount: stringValue(cost.amount),
          periodicity: periodicities.has(cost.periodicity)
            ? cost.periodicity
            : "monthly",
        }))
      : [],
    pricing: {
      mode: pricingMode,
      manualPrice: stringValue(data.pricing?.manualPrice),
      targetMarkupPercent: stringValue(data.pricing?.targetMarkupPercent),
      targetMarginPercent: stringValue(data.pricing?.targetMarginPercent),
    },
    simulator: {
      quantity: positiveQuantity(data.simulator?.quantity) || 1,
    },
    legacyCosts: {
      caseCost: stringValue(data.legacyCosts?.caseCost),
      laborCost: stringValue(data.legacyCosts?.laborCost),
      otherCost: stringValue(data.legacyCosts?.otherCost),
    },
  };
}

function normalizeComponents(components) {
  return Array.isArray(components)
    ? components.map((component) => ({
        id: stringValue(component.id) || makeId("component"),
        name: stringValue(component.name),
        quantity: stringValue(component.quantity),
        unitPrice: stringValue(component.unitPrice),
        supplier: stringValue(component.supplier),
      }))
    : [];
}

function migrateLegacyState(data) {
  const migrated = normalizeVersionTwoState({
    version: CURRENT_VERSION,
    components: data.components,
    simulator: {
      quantity: data.productionQty,
    },
  });

  const caseCost = stringValue(data.costs?.caseCost);
  const laborCost = stringValue(data.costs?.laborCost);
  const otherCost = stringValue(data.costs?.otherCost);
  const margin = stringValue(data.margin);

  migrated.legacyCosts = {
    caseCost,
    laborCost,
    otherCost,
  };

  if (nonNegativeNumber(caseCost) > 0) {
    migrated.printing.legacyManualCost = caseCost;
  }

  if (nonNegativeNumber(laborCost) > 0) {
    migrated.labor.push({
      id: makeId("labor"),
      name: "Mano de obra migrada",
      hours: "1",
      hourlyRate: laborCost,
      responsible: "",
    });
  }

  if (nonNegativeNumber(otherCost) > 0) {
    migrated.supplies.push({
      id: makeId("supply"),
      name: "Otros costos variables migrados",
      quantity: "1",
      unit: "otro",
      unitPrice: otherCost,
      supplier: "",
    });
  }

  if (margin !== "") {
    migrated.pricing.mode = "margin";
    migrated.pricing.targetMarginPercent = String(Math.min(nonNegativeNumber(margin), 99.99));
  }

  return migrated;
}

function loadState() {
  const rawState = readLocalStorage(STORAGE_KEY);
  const savedState = parseJsonSafely(rawState, STORAGE_KEY);

  if (!savedState) {
    return;
  }

  try {
    const shouldMigrate = !isVersionTwoState(savedState);
    const normalizedState = normalizeImportedState(savedState);

    if (shouldMigrate && rawState) {
      if (!readLocalStorage(LEGACY_BACKUP_KEY)) {
        writeLocalStorage(LEGACY_BACKUP_KEY, rawState);
      }

      migrationNotice =
        "Datos anteriores migrados a la estructura nueva. Se guardo una copia de respaldo local.";
      writeLocalStorage(STORAGE_KEY, JSON.stringify(normalizedState));
    }

    applyImportedState(normalizedState);
  } catch (error) {
    console.warn("No se pudo cargar el estado guardado.", error);
    setBackupStatus("No se pudo cargar el estado guardado. No se modifico localStorage.", true);
  }
}

function saveState() {
  const saved = writeLocalStorage(STORAGE_KEY, JSON.stringify(state));

  if (saved && storageMode === "cloud") {
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
  } catch (error) {
    console.warn("No se pudo guardar en Neon.", error);
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
    const normalizedState = normalizeImportedState(response.data);
    applyImportedState(normalizedState);
    storageMode = "cloud";
    writeLocalStorage(STORAGE_KEY, JSON.stringify(state));
    render();
    setStorageStatus("Conectado a Neon", "cloud");
    setBackupStatus("Datos cargados desde Neon.");
  } catch (error) {
    console.warn("No se pudo conectar a Neon.", error);
    storageMode = "local";
    setStorageStatus("Guardado local", "local");
  }
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
    writeLocalStorage("greenBoxWriteKey", editKey);
    headers["x-green-box-key"] = editKey;

    response = await fetch(apiUrl(path), {
      ...options,
      headers,
    });
  }

  if (!response.ok) {
    if (response.status === 401) {
      editKey = "";
      removeLocalStorage("greenBoxWriteKey");
    }

    throw new Error(`Error HTTP ${response.status}`);
  }

  return response.json();
}

function applyImportedState(importedState) {
  state = normalizeVersionTwoState(importedState);
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

function setFormMessage(element, message, isError = true) {
  element.textContent = message;
  element.classList.toggle("error", Boolean(isError && message));
}

function getBackupPayload() {
  return {
    app: "GREEN BOX",
    type: "green-box-cost-backup",
    version: CURRENT_VERSION,
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
  setBackupStatus("Respaldo exportado.");
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

function importBackup(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();

  reader.addEventListener("load", () => {
    try {
      const importedState = normalizeImportedState(
        JSON.parse(String(reader.result || "")),
      );
      const shouldImport = window.confirm(
        "Importar este respaldo va a reemplazar los datos actuales. Continuar?",
      );

      if (!shouldImport) {
        setBackupStatus("Importacion cancelada.");
        return;
      }

      applyImportedState(importedState);
      resetAllForms();
      saveState();
      render();
      setBackupStatus("Respaldo importado.");
    } catch (error) {
      console.warn("No se pudo importar el respaldo.", error);
      setBackupStatus("No se pudo importar el archivo. Los datos actuales no se modificaron.", true);
    } finally {
      elements.importBackupInput.value = "";
    }
  });

  reader.readAsText(file);
}

function resetAllData() {
  const firstConfirmation = window.confirm("Seguro que queres borrar todos los datos?");

  if (!firstConfirmation) {
    return;
  }

  const secondConfirmation = window.confirm(
    "Esta accion eliminara todos los datos guardados de Green Box. Continuar?",
  );

  if (!secondConfirmation) {
    return;
  }

  applyImportedState(createDefaultState());
  resetAllForms();
  saveState();
  render();
  setBackupStatus("Todos los datos fueron restablecidos.");
}

function validateText(value, message) {
  return stringValue(value) ? "" : message;
}

function validateNumber(value, options = {}) {
  const {
    label = "El valor",
    required = false,
    min = 0,
    max = Number.POSITIVE_INFINITY,
    exclusiveMin = false,
  } = options;
  const text = stringValue(value);

  if (text === "") {
    return required ? `${label} es obligatorio.` : "";
  }

  const number = Number(text.replace(",", "."));

  if (!Number.isFinite(number)) {
    return `${label} debe ser un numero valido.`;
  }

  if (exclusiveMin ? number <= min : number < min) {
    return exclusiveMin
      ? `${label} debe ser mayor que ${decimalFormatter.format(min)}.`
      : `${label} no puede ser menor que ${decimalFormatter.format(min)}.`;
  }

  if (number > max) {
    return `${label} no puede ser mayor que ${decimalFormatter.format(max)}.`;
  }

  return "";
}

function firstValidationError(validations) {
  return validations.find(Boolean) || "";
}

function upsertListItem(list, item) {
  const existingIndex = list.findIndex((entry) => entry.id === item.id);

  if (existingIndex >= 0) {
    list[existingIndex] = item;
  } else {
    list.push(item);
  }
}

function deleteListItem(list, id) {
  const index = list.findIndex((entry) => entry.id === id);

  if (index >= 0) {
    list.splice(index, 1);
  }
}

function upsertComponent(event) {
  event.preventDefault();

  const error = firstValidationError([
    validateText(elements.componentName.value, "El nombre del componente es obligatorio."),
    validateNumber(elements.componentQty.value, {
      label: "La cantidad",
      required: true,
      min: 0,
      exclusiveMin: true,
    }),
    validateNumber(elements.componentPrice.value, {
      label: "El precio unitario",
      required: true,
      min: 0,
    }),
  ]);

  if (error) {
    setFormMessage(elements.componentFormMessage, error);
    return;
  }

  upsertListItem(state.components, {
    id: elements.componentId.value || makeId("component"),
    name: stringValue(elements.componentName.value),
    quantity: stringValue(elements.componentQty.value),
    unitPrice: stringValue(elements.componentPrice.value),
    supplier: stringValue(elements.componentSupplier.value),
  });

  resetComponentForm();
  saveAndRender();
}

function editComponent(id) {
  const component = state.components.find((item) => item.id === id);

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
  setFormMessage(elements.componentFormMessage, "", false);
  elements.componentName.focus();
}

function deleteComponent(id) {
  if (!window.confirm("Seguro que queres eliminar este componente?")) {
    return;
  }

  deleteListItem(state.components, id);
  saveAndRender();
}

function clearComponents() {
  if (state.components.length === 0) {
    return;
  }

  if (!window.confirm("Seguro que queres eliminar todos los componentes de hardware?")) {
    return;
  }

  state.components = [];
  resetComponentForm();
  saveAndRender();
}

function resetComponentForm() {
  elements.componentId.value = "";
  elements.componentName.value = "";
  elements.componentQty.value = "";
  elements.componentPrice.value = "";
  elements.componentSupplier.value = "";
  elements.saveComponentBtn.textContent = "Agregar hardware";
  elements.cancelEditBtn.classList.add("hidden");
  setFormMessage(elements.componentFormMessage, "", false);
}

function upsertPrintingPiece(event) {
  event.preventDefault();

  const error = firstValidationError([
    validateText(elements.printingPieceName.value, "El nombre de la pieza es obligatorio."),
    validateNumber(elements.printingPieceQty.value, {
      label: "La cantidad de piezas",
      required: true,
      min: 0,
      exclusiveMin: true,
    }),
    validateNumber(elements.printingPieceWeight.value, {
      label: "El peso unitario",
      required: true,
      min: 0,
      exclusiveMin: true,
    }),
  ]);

  if (error) {
    setFormMessage(elements.printingPieceFormMessage, error);
    return;
  }

  upsertListItem(state.printing.pieces, {
    id: elements.printingPieceId.value || makeId("piece"),
    name: stringValue(elements.printingPieceName.value),
    quantity: stringValue(elements.printingPieceQty.value),
    weightGrams: stringValue(elements.printingPieceWeight.value),
  });

  resetPrintingPieceForm();
  saveAndRender();
}

function editPrintingPiece(id) {
  const piece = state.printing.pieces.find((item) => item.id === id);

  if (!piece) {
    return;
  }

  elements.printingPieceId.value = piece.id;
  elements.printingPieceName.value = piece.name;
  elements.printingPieceQty.value = piece.quantity;
  elements.printingPieceWeight.value = piece.weightGrams;
  elements.savePrintingPieceBtn.textContent = "Guardar cambios";
  elements.cancelPrintingPieceEditBtn.classList.remove("hidden");
  setFormMessage(elements.printingPieceFormMessage, "", false);
  elements.printingPieceName.focus();
}

function deletePrintingPiece(id) {
  if (!window.confirm("Seguro que queres eliminar esta pieza impresa?")) {
    return;
  }

  deleteListItem(state.printing.pieces, id);
  saveAndRender();
}

function resetPrintingPieceForm() {
  elements.printingPieceId.value = "";
  elements.printingPieceName.value = "";
  elements.printingPieceQty.value = "";
  elements.printingPieceWeight.value = "";
  elements.savePrintingPieceBtn.textContent = "Agregar pieza";
  elements.cancelPrintingPieceEditBtn.classList.add("hidden");
  setFormMessage(elements.printingPieceFormMessage, "", false);
}

function upsertSupply(event) {
  event.preventDefault();

  const error = firstValidationError([
    validateText(elements.supplyName.value, "El nombre del insumo es obligatorio."),
    validateNumber(elements.supplyQty.value, {
      label: "La cantidad utilizada",
      required: true,
      min: 0,
      exclusiveMin: true,
    }),
    validateNumber(elements.supplyPrice.value, {
      label: "El precio unitario",
      required: true,
      min: 0,
    }),
  ]);

  if (error) {
    setFormMessage(elements.supplyFormMessage, error);
    return;
  }

  upsertListItem(state.supplies, {
    id: elements.supplyId.value || makeId("supply"),
    name: stringValue(elements.supplyName.value),
    quantity: stringValue(elements.supplyQty.value),
    unit: SUPPLY_UNITS.includes(elements.supplyUnit.value)
      ? elements.supplyUnit.value
      : "unidad",
    unitPrice: stringValue(elements.supplyPrice.value),
    supplier: stringValue(elements.supplySupplier.value),
  });

  resetSupplyForm();
  saveAndRender();
}

function editSupply(id) {
  const supply = state.supplies.find((item) => item.id === id);

  if (!supply) {
    return;
  }

  elements.supplyId.value = supply.id;
  elements.supplyName.value = supply.name;
  elements.supplyQty.value = supply.quantity;
  elements.supplyUnit.value = supply.unit;
  elements.supplyPrice.value = supply.unitPrice;
  elements.supplySupplier.value = supply.supplier;
  elements.saveSupplyBtn.textContent = "Guardar cambios";
  elements.cancelSupplyEditBtn.classList.remove("hidden");
  setFormMessage(elements.supplyFormMessage, "", false);
  elements.supplyName.focus();
}

function deleteSupply(id) {
  if (!window.confirm("Seguro que queres eliminar este insumo?")) {
    return;
  }

  deleteListItem(state.supplies, id);
  saveAndRender();
}

function resetSupplyForm() {
  elements.supplyId.value = "";
  elements.supplyName.value = "";
  elements.supplyQty.value = "";
  elements.supplyUnit.value = "unidad";
  elements.supplyPrice.value = "";
  elements.supplySupplier.value = "";
  elements.saveSupplyBtn.textContent = "Agregar insumo";
  elements.cancelSupplyEditBtn.classList.add("hidden");
  setFormMessage(elements.supplyFormMessage, "", false);
}

function upsertLabor(event) {
  event.preventDefault();

  const error = firstValidationError([
    validateText(elements.laborName.value, "El nombre de la tarea es obligatorio."),
    validateNumber(elements.laborHours.value, {
      label: "Las horas",
      required: true,
      min: 0,
      exclusiveMin: true,
    }),
    validateNumber(elements.laborRate.value, {
      label: "El valor de la hora",
      required: true,
      min: 0,
    }),
  ]);

  if (error) {
    setFormMessage(elements.laborFormMessage, error);
    return;
  }

  upsertListItem(state.labor, {
    id: elements.laborId.value || makeId("labor"),
    name: stringValue(elements.laborName.value),
    hours: stringValue(elements.laborHours.value),
    hourlyRate: stringValue(elements.laborRate.value),
    responsible: stringValue(elements.laborResponsible.value),
  });

  resetLaborForm();
  saveAndRender();
}

function editLabor(id) {
  const task = state.labor.find((item) => item.id === id);

  if (!task) {
    return;
  }

  elements.laborId.value = task.id;
  elements.laborName.value = task.name;
  elements.laborHours.value = task.hours;
  elements.laborRate.value = task.hourlyRate;
  elements.laborResponsible.value = task.responsible;
  elements.saveLaborBtn.textContent = "Guardar cambios";
  elements.cancelLaborEditBtn.classList.remove("hidden");
  setFormMessage(elements.laborFormMessage, "", false);
  elements.laborName.focus();
}

function deleteLabor(id) {
  if (!window.confirm("Seguro que queres eliminar esta tarea?")) {
    return;
  }

  deleteListItem(state.labor, id);
  saveAndRender();
}

function resetLaborForm() {
  elements.laborId.value = "";
  elements.laborName.value = "";
  elements.laborHours.value = "";
  elements.laborRate.value = "";
  elements.laborResponsible.value = "";
  elements.saveLaborBtn.textContent = "Agregar tarea";
  elements.cancelLaborEditBtn.classList.add("hidden");
  setFormMessage(elements.laborFormMessage, "", false);
}

function upsertPackaging(event) {
  event.preventDefault();

  const error = firstValidationError([
    validateText(elements.packagingName.value, "El elemento es obligatorio."),
    validateNumber(elements.packagingQty.value, {
      label: "La cantidad",
      required: true,
      min: 0,
      exclusiveMin: true,
    }),
    validateNumber(elements.packagingPrice.value, {
      label: "El precio unitario",
      required: true,
      min: 0,
    }),
  ]);

  if (error) {
    setFormMessage(elements.packagingFormMessage, error);
    return;
  }

  upsertListItem(state.packaging, {
    id: elements.packagingId.value || makeId("packaging"),
    name: stringValue(elements.packagingName.value),
    quantity: stringValue(elements.packagingQty.value),
    unitPrice: stringValue(elements.packagingPrice.value),
    supplier: stringValue(elements.packagingSupplier.value),
  });

  resetPackagingForm();
  saveAndRender();
}

function editPackaging(id) {
  const item = state.packaging.find((entry) => entry.id === id);

  if (!item) {
    return;
  }

  elements.packagingId.value = item.id;
  elements.packagingName.value = item.name;
  elements.packagingQty.value = item.quantity;
  elements.packagingPrice.value = item.unitPrice;
  elements.packagingSupplier.value = item.supplier;
  elements.savePackagingBtn.textContent = "Guardar cambios";
  elements.cancelPackagingEditBtn.classList.remove("hidden");
  setFormMessage(elements.packagingFormMessage, "", false);
  elements.packagingName.focus();
}

function deletePackaging(id) {
  if (!window.confirm("Seguro que queres eliminar este elemento de packaging?")) {
    return;
  }

  deleteListItem(state.packaging, id);
  saveAndRender();
}

function resetPackagingForm() {
  elements.packagingId.value = "";
  elements.packagingName.value = "";
  elements.packagingQty.value = "";
  elements.packagingPrice.value = "";
  elements.packagingSupplier.value = "";
  elements.savePackagingBtn.textContent = "Agregar elemento";
  elements.cancelPackagingEditBtn.classList.add("hidden");
  setFormMessage(elements.packagingFormMessage, "", false);
}

function upsertMonthlyCost(event) {
  event.preventDefault();

  const error = firstValidationError([
    validateText(elements.monthlyConcept.value, "El concepto es obligatorio."),
    validateNumber(elements.monthlyAmount.value, {
      label: "El monto",
      required: true,
      min: 0,
    }),
  ]);

  if (error) {
    setFormMessage(elements.monthlyCostFormMessage, error);
    return;
  }

  upsertListItem(state.monthlyCosts, {
    id: elements.monthlyCostId.value || makeId("monthly"),
    concept: stringValue(elements.monthlyConcept.value),
    category: MONTHLY_CATEGORIES.includes(elements.monthlyCategory.value)
      ? elements.monthlyCategory.value
      : "Otros",
    amount: stringValue(elements.monthlyAmount.value),
    periodicity: PERIODICITIES.includes(elements.monthlyPeriodicity.value)
      ? elements.monthlyPeriodicity.value
      : "monthly",
  });

  resetMonthlyCostForm();
  saveAndRender();
}

function editMonthlyCost(id) {
  const cost = state.monthlyCosts.find((item) => item.id === id);

  if (!cost) {
    return;
  }

  elements.monthlyCostId.value = cost.id;
  elements.monthlyConcept.value = cost.concept;
  elements.monthlyCategory.value = cost.category;
  elements.monthlyPeriodicity.value = cost.periodicity;
  elements.monthlyAmount.value = cost.amount;
  elements.saveMonthlyCostBtn.textContent = "Guardar cambios";
  elements.cancelMonthlyCostEditBtn.classList.remove("hidden");
  setFormMessage(elements.monthlyCostFormMessage, "", false);
  elements.monthlyConcept.focus();
}

function deleteMonthlyCost(id) {
  if (!window.confirm("Seguro que queres eliminar este costo mensual?")) {
    return;
  }

  deleteListItem(state.monthlyCosts, id);
  saveAndRender();
}

function resetMonthlyCostForm() {
  elements.monthlyCostId.value = "";
  elements.monthlyConcept.value = "";
  elements.monthlyCategory.value = "Infraestructura";
  elements.monthlyPeriodicity.value = "monthly";
  elements.monthlyAmount.value = "";
  elements.saveMonthlyCostBtn.textContent = "Agregar costo";
  elements.cancelMonthlyCostEditBtn.classList.add("hidden");
  setFormMessage(elements.monthlyCostFormMessage, "", false);
}

function resetAllForms() {
  resetComponentForm();
  resetPrintingPieceForm();
  resetSupplyForm();
  resetLaborForm();
  resetPackagingForm();
  resetMonthlyCostForm();
  setFormMessage(elements.printingConfigMessage, "", false);
  setFormMessage(elements.adjustmentsMessage, "", false);
  setFormMessage(elements.pricingMessage, "", false);
  setFormMessage(elements.simulatorMessage, "", false);
}

function saveAndRender() {
  saveState();
  render();
}

function updateFilamentField(field, value) {
  state.printing.filament[field] = stringValue(value);
  saveAndRender();
}

function updatePrintingWaste(value) {
  const error = validateNumber(value, {
    label: "El porcentaje de desperdicio",
    min: 0,
    max: 100,
  });

  if (error) {
    setFormMessage(elements.printingConfigMessage, error);
    return;
  }

  state.printing.wastePercent = stringValue(value);
  setFormMessage(elements.printingConfigMessage, "", false);
  saveAndRender();
}

function updateAdjustment(field, value, label) {
  const error = validateNumber(value, {
    label,
    min: 0,
    max: 100,
  });

  if (error) {
    setFormMessage(elements.adjustmentsMessage, error);
    return;
  }

  state.adjustments[field] = stringValue(value);
  setFormMessage(elements.adjustmentsMessage, "", false);
  saveAndRender();
}

function updatePricingMode(mode) {
  if (!PRICING_MODES.includes(mode)) {
    return;
  }

  state.pricing.mode = mode;
  setFormMessage(elements.pricingMessage, "", false);
  saveAndRender();
}

function updatePricingField(field, value, options) {
  const error = validateNumber(value, options);

  if (field === "targetMarginPercent" && nonNegativeNumber(value) >= 100) {
    setFormMessage(elements.pricingMessage, "El margen debe ser menor a 100%.");
    return;
  }

  if (error) {
    setFormMessage(elements.pricingMessage, error);
    return;
  }

  state.pricing[field] = stringValue(value);
  setFormMessage(elements.pricingMessage, "", false);
  saveAndRender();
}

function updateSimulatorQuantity(value) {
  const error = validateNumber(value, {
    label: "La cantidad",
    required: true,
    min: 0,
    exclusiveMin: true,
  });

  if (error) {
    setFormMessage(elements.simulatorMessage, error);
    return;
  }

  state.simulator.quantity = positiveQuantity(value);
  setFormMessage(elements.simulatorMessage, "", false);
  saveAndRender();
}

function render() {
  const summary = calculateFinancialSummary(state);

  syncInputs();
  renderTables(summary);
  renderSummary(summary);
  renderPrintingSummary(summary);
  renderAdjustments(summary);
  renderPricing(summary);
  renderSimulator(summary);
  renderBreakEven(summary);
  renderMigrationStatus();
}

function syncInputs() {
  elements.filamentName.value = state.printing.filament.name;
  elements.filamentSpoolPrice.value = state.printing.filament.spoolPrice;
  elements.filamentSpoolWeight.value = state.printing.filament.spoolWeightGrams;
  elements.printingWastePercent.value = state.printing.wastePercent;
  elements.generalWastePercent.value = state.adjustments.wastePercent;
  elements.warrantyPercent.value = state.adjustments.warrantyPercent;
  elements.manualSalePrice.value = state.pricing.manualPrice;
  elements.targetMarkupPercent.value = state.pricing.targetMarkupPercent;
  elements.targetMarginPercent.value = state.pricing.targetMarginPercent;
  elements.productionQty.value = state.simulator.quantity;

  elements.pricingModeInputs.forEach((input) => {
    input.checked = input.value === state.pricing.mode;
  });

  elements.manualPriceGroup.classList.toggle("hidden", state.pricing.mode !== "manual");
  elements.markupGroup.classList.toggle("hidden", state.pricing.mode !== "markup");
  elements.targetMarginGroup.classList.toggle("hidden", state.pricing.mode !== "margin");
}

function renderTables(summary) {
  renderComponents();
  renderPrintingPieces(summary);
  renderSupplies();
  renderLabor();
  renderPackaging();
  renderMonthlyCosts();
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
          <td><div class="record-name">${escapeHtml(component.name)}</div></td>
          <td>${formatQuantity(positiveQuantity(component.quantity))}</td>
          <td>${formatMoney(nonNegativeNumber(component.unitPrice))}</td>
          <td class="muted-text">${escapeHtml(component.supplier || "-")}</td>
          <td><strong>${formatMoney(calculateRecordCost(component))}</strong></td>
          <td>
            <div class="row-actions">
              <button class="icon-button" type="button" data-action="edit-component" data-id="${escapeAttribute(component.id)}">Editar</button>
              <button class="icon-button danger" type="button" data-action="delete-component" data-id="${escapeAttribute(component.id)}">Borrar</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderPrintingPieces(summary) {
  if (state.printing.pieces.length === 0) {
    elements.printingPiecesTableBody.innerHTML =
      '<tr><td colspan="6" class="empty-row">Sin piezas cargadas.</td></tr>';
    return;
  }

  const piecesById = new Map(summary.printingPieces.map((piece) => [piece.id, piece]));

  elements.printingPiecesTableBody.innerHTML = state.printing.pieces
    .map((piece) => {
      const calculated = piecesById.get(piece.id) || {
        totalGrams: 0,
        baseCost: 0,
      };

      return `
        <tr>
          <td><div class="record-name">${escapeHtml(piece.name)}</div></td>
          <td>${formatQuantity(positiveQuantity(piece.quantity))}</td>
          <td>${formatQuantity(positiveQuantity(piece.weightGrams), "g")}</td>
          <td>${formatQuantity(calculated.totalGrams, "g")}</td>
          <td><strong>${formatMoney(calculated.baseCost)}</strong></td>
          <td>
            <div class="row-actions">
              <button class="icon-button" type="button" data-action="edit-printing-piece" data-id="${escapeAttribute(piece.id)}">Editar</button>
              <button class="icon-button danger" type="button" data-action="delete-printing-piece" data-id="${escapeAttribute(piece.id)}">Borrar</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSupplies() {
  if (state.supplies.length === 0) {
    elements.suppliesTableBody.innerHTML =
      '<tr><td colspan="7" class="empty-row">Sin insumos cargados.</td></tr>';
    return;
  }

  elements.suppliesTableBody.innerHTML = state.supplies
    .map(
      (supply) => `
        <tr>
          <td><div class="record-name">${escapeHtml(supply.name)}</div></td>
          <td>${formatQuantity(positiveQuantity(supply.quantity))}</td>
          <td>${escapeHtml(supply.unit)}</td>
          <td>${formatMoney(nonNegativeNumber(supply.unitPrice))}</td>
          <td class="muted-text">${escapeHtml(supply.supplier || "-")}</td>
          <td><strong>${formatMoney(calculateRecordCost(supply))}</strong></td>
          <td>
            <div class="row-actions">
              <button class="icon-button" type="button" data-action="edit-supply" data-id="${escapeAttribute(supply.id)}">Editar</button>
              <button class="icon-button danger" type="button" data-action="delete-supply" data-id="${escapeAttribute(supply.id)}">Borrar</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderLabor() {
  if (state.labor.length === 0) {
    elements.laborTableBody.innerHTML =
      '<tr><td colspan="6" class="empty-row">Sin tareas cargadas.</td></tr>';
    return;
  }

  elements.laborTableBody.innerHTML = state.labor
    .map(
      (task) => `
        <tr>
          <td><div class="record-name">${escapeHtml(task.name)}</div></td>
          <td>${formatQuantity(positiveQuantity(task.hours), "h")}</td>
          <td>${formatMoney(nonNegativeNumber(task.hourlyRate))}</td>
          <td class="muted-text">${escapeHtml(task.responsible || "-")}</td>
          <td><strong>${formatMoney(calculateRecordCost(task, "hours", "hourlyRate"))}</strong></td>
          <td>
            <div class="row-actions">
              <button class="icon-button" type="button" data-action="edit-labor" data-id="${escapeAttribute(task.id)}">Editar</button>
              <button class="icon-button danger" type="button" data-action="delete-labor" data-id="${escapeAttribute(task.id)}">Borrar</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderPackaging() {
  if (state.packaging.length === 0) {
    elements.packagingTableBody.innerHTML =
      '<tr><td colspan="6" class="empty-row">Sin packaging cargado.</td></tr>';
    return;
  }

  elements.packagingTableBody.innerHTML = state.packaging
    .map(
      (item) => `
        <tr>
          <td><div class="record-name">${escapeHtml(item.name)}</div></td>
          <td>${formatQuantity(positiveQuantity(item.quantity))}</td>
          <td>${formatMoney(nonNegativeNumber(item.unitPrice))}</td>
          <td class="muted-text">${escapeHtml(item.supplier || "-")}</td>
          <td><strong>${formatMoney(calculateRecordCost(item))}</strong></td>
          <td>
            <div class="row-actions">
              <button class="icon-button" type="button" data-action="edit-packaging" data-id="${escapeAttribute(item.id)}">Editar</button>
              <button class="icon-button danger" type="button" data-action="delete-packaging" data-id="${escapeAttribute(item.id)}">Borrar</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderMonthlyCosts() {
  if (state.monthlyCosts.length === 0) {
    elements.monthlyCostsTableBody.innerHTML =
      '<tr><td colspan="6" class="empty-row">Sin costos mensuales cargados.</td></tr>';
    return;
  }

  elements.monthlyCostsTableBody.innerHTML = state.monthlyCosts
    .map(
      (cost) => `
        <tr>
          <td><div class="record-name">${escapeHtml(cost.concept)}</div></td>
          <td>${escapeHtml(cost.category)}</td>
          <td>${formatPeriodicity(cost.periodicity)}</td>
          <td>${formatMoney(nonNegativeNumber(cost.amount))}</td>
          <td><strong>${formatMoney(calculateMonthlyEquivalent(cost))}</strong></td>
          <td>
            <div class="row-actions">
              <button class="icon-button" type="button" data-action="edit-monthly-cost" data-id="${escapeAttribute(cost.id)}">Editar</button>
              <button class="icon-button danger" type="button" data-action="delete-monthly-cost" data-id="${escapeAttribute(cost.id)}">Borrar</button>
            </div>
          </td>
        </tr>
      `,
    )
    .join("");
}

function renderSummary(summary) {
  const isLoss = summary.contributionPerUnit < 0;

  elements.summaryUnitCost.textContent = formatMoney(summary.variableUnitCost);
  elements.summarySalePrice.textContent = formatMoney(summary.salePrice);
  elements.summaryProfit.textContent = formatMoney(summary.contributionPerUnit);
  elements.summaryMargin.textContent = formatPercent(summary.marginPercent);
  elements.summaryFixedCosts.textContent = formatMoney(summary.monthlyFixedCosts);
  elements.summaryBreakEven.textContent = summary.breakEvenUnits
    ? `${summary.breakEvenUnits} unidades`
    : "No calculable";
  elements.summaryContributionLabel.textContent = isLoss
    ? "Perdida por unidad"
    : "Contribucion por unidad";
  elements.summaryContributionCard.classList.toggle("negative", isLoss);
  elements.summaryContributionCard.classList.toggle(
    "positive",
    !isLoss && summary.contributionPerUnit > 0,
  );

  elements.componentsTotal.textContent = formatMoney(summary.hardwareTotal);
  elements.suppliesTotal.textContent = formatMoney(summary.suppliesTotal);
  elements.laborHoursTotal.textContent = formatQuantity(summary.laborHoursTotal, "h");
  elements.laborTotal.textContent = formatMoney(summary.laborTotal);
  elements.packagingTotal.textContent = formatMoney(summary.packagingTotal);
  elements.monthlyFixedCosts.textContent = formatMoney(summary.monthlyFixedCosts);
  elements.directBaseCost.textContent = formatMoney(summary.directBaseCost);
  elements.variableUnitCost.textContent = formatMoney(summary.variableUnitCost);

  renderCostBreakdown(summary);
}

function renderCostBreakdown(summary) {
  const categories = [
    ["Hardware", summary.hardwareTotal],
    ["Impresion 3D", summary.printingTotal],
    ["Insumos", summary.suppliesTotal],
    ["Mano de obra", summary.laborTotal],
    ["Packaging", summary.packagingTotal],
    ["Merma", summary.wasteCost],
    ["Garantia", summary.warrantyReserve],
  ];

  if (summary.variableUnitCost <= 0) {
    elements.costBreakdownList.innerHTML =
      '<div class="empty-state">Sin datos de costo para desglosar.</div>';
    return;
  }

  elements.costBreakdownList.innerHTML = categories
    .map(([label, value]) => {
      const percent = (value / summary.variableUnitCost) * 100;
      const width = Math.max(0, Math.min(percent, 100));

      return `
        <div class="breakdown-row">
          <div class="breakdown-meta">
            <span>${escapeHtml(label)}</span>
            <strong>${formatMoney(value)} · ${formatPercent(percent)}</strong>
          </div>
          <div class="breakdown-track" aria-hidden="true">
            <span style="width: ${width}%"></span>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderPrintingSummary(summary) {
  elements.filamentPricePerGram.textContent = summary.filamentPricePerGram > 0
    ? formatMoney(summary.filamentPricePerGram)
    : "Sin datos";
  elements.printingTotalGrams.textContent = formatQuantity(summary.printingTotalGrams, "g");
  elements.printingBaseCost.textContent = formatMoney(summary.printingBaseCost);
  elements.printingWasteCost.textContent = formatMoney(summary.printingWasteCost);
  elements.printingTotal.textContent = formatMoney(summary.printingTotal);
}

function renderAdjustments(summary) {
  elements.wasteBase.textContent = formatMoney(summary.wasteBase);
  elements.wasteCost.textContent = formatMoney(summary.wasteCost);
  elements.warrantyBase.textContent = formatMoney(summary.warrantyBase);
  elements.warrantyReserve.textContent = formatMoney(summary.warrantyReserve);
}

function renderPricing(summary) {
  const isLoss = summary.contributionPerUnit < 0;

  elements.pricingVariableCost.textContent = formatMoney(summary.variableUnitCost);
  elements.salePrice.textContent = formatMoney(summary.salePrice);
  elements.unitProfit.textContent = formatMoney(summary.contributionPerUnit);
  elements.unitProfitLabel.textContent = isLoss
    ? "Perdida por unidad"
    : "Contribucion por unidad";
  elements.unitProfit.classList.toggle("negative-text", isLoss);
  elements.unitProfit.classList.toggle(
    "positive-text",
    !isLoss && summary.contributionPerUnit > 0,
  );
  elements.actualMargin.textContent = formatPercent(summary.marginPercent);
  elements.actualMarkup.textContent = formatPercent(summary.markupPercent);

  if (summary.pricingError) {
    setFormMessage(elements.pricingMessage, summary.pricingError);
  }
}

function renderSimulator(summary) {
  const isLoss = summary.estimatedResult < 0;

  elements.simulatorUnits.textContent = formatQuantity(summary.simulatorQuantity);
  elements.requiredInvestment.textContent = formatMoney(summary.requiredInvestment);
  elements.simulatorVariableTotal.textContent = formatMoney(summary.simulatorVariableTotal);
  elements.estimatedRevenue.textContent = formatMoney(summary.estimatedRevenue);
  elements.estimatedContribution.textContent = formatMoney(summary.estimatedContribution);
  elements.simulatorFixedCosts.textContent = formatMoney(summary.monthlyFixedCosts);
  elements.estimatedProfit.textContent = isLoss
    ? `Perdida: ${formatMoney(summary.estimatedResult)}`
    : `Resultado positivo: ${formatMoney(summary.estimatedResult)}`;
  elements.estimatedProfit.classList.toggle("negative-text", isLoss);
  elements.estimatedProfit.classList.toggle("positive-text", !isLoss);

  elements.simulatorQtyButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      Number(button.dataset.simulatorQty) === Number(summary.simulatorQuantity),
    );
  });
}

function renderBreakEven(summary) {
  elements.breakEvenUnits.textContent = summary.breakEvenUnits
    ? `${summary.breakEvenUnits} Green Box por mes`
    : "No calculable";
  elements.breakEvenMessage.textContent = summary.breakEvenMessage;
  elements.breakEvenFixedCosts.textContent = formatMoney(summary.monthlyFixedCosts);
  elements.breakEvenContribution.textContent = formatMoney(summary.contributionPerUnit);
}

function renderMigrationStatus() {
  if (!migrationNotice) {
    elements.migrationStatus.classList.add("hidden");
    elements.migrationStatus.textContent = "";
    return;
  }

  elements.migrationStatus.textContent = migrationNotice;
  elements.migrationStatus.classList.remove("hidden");
}

function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const { action, id } = button.dataset;
  const handlers = {
    "edit-component": editComponent,
    "delete-component": deleteComponent,
    "edit-printing-piece": editPrintingPiece,
    "delete-printing-piece": deletePrintingPiece,
    "edit-supply": editSupply,
    "delete-supply": deleteSupply,
    "edit-labor": editLabor,
    "delete-labor": deleteLabor,
    "edit-packaging": editPackaging,
    "delete-packaging": deletePackaging,
    "edit-monthly-cost": editMonthlyCost,
    "delete-monthly-cost": deleteMonthlyCost,
  };

  handlers[action]?.(id);
}

function bindEvents() {
  elements.tabButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setActiveSection(button.dataset.sectionTarget);
    });
  });

  elements.componentForm.addEventListener("submit", upsertComponent);
  elements.cancelEditBtn.addEventListener("click", resetComponentForm);
  elements.clearComponentsBtn.addEventListener("click", clearComponents);
  elements.componentsTableBody.addEventListener("click", handleTableAction);

  elements.filamentName.addEventListener("input", (event) => {
    updateFilamentField("name", event.target.value);
  });
  elements.filamentSpoolPrice.addEventListener("input", (event) => {
    const error = validateNumber(event.target.value, {
      label: "El precio del rollo",
      min: 0,
    });

    if (error) {
      setFormMessage(elements.printingConfigMessage, error);
      return;
    }

    setFormMessage(elements.printingConfigMessage, "", false);
    updateFilamentField("spoolPrice", event.target.value);
  });
  elements.filamentSpoolWeight.addEventListener("input", (event) => {
    const error = validateNumber(event.target.value, {
      label: "El peso del rollo",
      min: 0,
    });

    if (error) {
      setFormMessage(elements.printingConfigMessage, error);
      return;
    }

    setFormMessage(elements.printingConfigMessage, "", false);
    updateFilamentField("spoolWeightGrams", event.target.value);
  });
  elements.printingWastePercent.addEventListener("input", (event) => {
    updatePrintingWaste(event.target.value);
  });
  elements.printingPieceForm.addEventListener("submit", upsertPrintingPiece);
  elements.cancelPrintingPieceEditBtn.addEventListener("click", resetPrintingPieceForm);
  elements.printingPiecesTableBody.addEventListener("click", handleTableAction);

  elements.supplyForm.addEventListener("submit", upsertSupply);
  elements.cancelSupplyEditBtn.addEventListener("click", resetSupplyForm);
  elements.suppliesTableBody.addEventListener("click", handleTableAction);

  elements.laborForm.addEventListener("submit", upsertLabor);
  elements.cancelLaborEditBtn.addEventListener("click", resetLaborForm);
  elements.laborTableBody.addEventListener("click", handleTableAction);

  elements.packagingForm.addEventListener("submit", upsertPackaging);
  elements.cancelPackagingEditBtn.addEventListener("click", resetPackagingForm);
  elements.packagingTableBody.addEventListener("click", handleTableAction);

  elements.generalWastePercent.addEventListener("input", (event) => {
    updateAdjustment("wastePercent", event.target.value, "El porcentaje de merma");
  });
  elements.warrantyPercent.addEventListener("input", (event) => {
    updateAdjustment("warrantyPercent", event.target.value, "La reserva de garantia");
  });

  elements.monthlyCostForm.addEventListener("submit", upsertMonthlyCost);
  elements.cancelMonthlyCostEditBtn.addEventListener("click", resetMonthlyCostForm);
  elements.monthlyCostsTableBody.addEventListener("click", handleTableAction);

  elements.pricingModeInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      updatePricingMode(event.target.value);
    });
  });
  elements.manualSalePrice.addEventListener("input", (event) => {
    updatePricingField("manualPrice", event.target.value, {
      label: "El precio de venta",
      min: 0,
    });
  });
  elements.targetMarkupPercent.addEventListener("input", (event) => {
    updatePricingField("targetMarkupPercent", event.target.value, {
      label: "El recargo",
      min: 0,
    });
  });
  elements.targetMarginPercent.addEventListener("input", (event) => {
    updatePricingField("targetMarginPercent", event.target.value, {
      label: "El margen",
      min: 0,
      max: 99.99,
    });
  });

  elements.simulatorQtyButtons.forEach((button) => {
    button.addEventListener("click", () => {
      updateSimulatorQuantity(button.dataset.simulatorQty);
    });
  });
  elements.productionQty.addEventListener("input", (event) => {
    updateSimulatorQuantity(event.target.value);
  });

  elements.exportBackupBtn.addEventListener("click", downloadBackup);
  elements.exportPublicDataBtn.addEventListener("click", downloadPublicData);
  elements.importBackupBtn.addEventListener("click", () => {
    elements.importBackupInput.click();
  });
  elements.importBackupInput.addEventListener("change", (event) => {
    importBackup(event.target.files[0]);
  });
  elements.resetAllDataBtn.addEventListener("click", resetAllData);
}

function setActiveSection(sectionId) {
  elements.tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.sectionTarget === sectionId);
  });

  elements.appSections.forEach((section) => {
    section.classList.toggle("active", section.id === sectionId);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function exposeTestApi() {
  globalThis.GreenBoxCostApp = {
    get state() {
      return state;
    },
    calculateFinancialSummary,
    normalizeImportedState,
    createDefaultState,
    formatMoney,
  };
}

loadState();
bindEvents();
exposeTestApi();
render();
connectCloudStorage();
