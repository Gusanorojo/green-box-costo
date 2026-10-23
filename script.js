const STORAGE_KEY = "greenBoxCostManager";
const LEGACY_BACKUP_KEY = `${STORAGE_KEY}.legacyV1Backup`;
const HARDWARE_RECOVERY_BACKUP_KEY = `${STORAGE_KEY}.hardwareRecoveryBackup`;
const CLOUD_MERGE_BACKUP_KEY = `${STORAGE_KEY}.cloudMergeBackup`;
const STORAGE_LOG_PREFIX = "[Green Box persistencia]";
const PUBLIC_DATA_FILE = "green-box-data.json";
const API_BASE_URL = (globalThis.GREEN_BOX_API_URL || "").replace(/\/$/, "");
const CURRENT_VERSION = 6;
const CURRENCY = globalThis.GreenBoxCurrency;

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
  printingElectricityCostInput: document.querySelector("#printingElectricityCostPerBox"),
  printingElectricityTotal: document.querySelector("#printingElectricityTotal"),
  printingConfigMessage: document.querySelector("#printingConfigMessage"),
  filamentPricePerGram: document.querySelector("#filamentPricePerGram"),
  printingTotalGrams: document.querySelector("#printingTotalGrams"),
  printingBaseCost: document.querySelector("#printingBaseCost"),
  printingWasteCost: document.querySelector("#printingWasteCost"),
  printingTotal: document.querySelector("#printingTotal"),
  printingTotalHours: document.querySelector("#printingTotalHours"),
  printingPieceForm: document.querySelector("#printingPieceForm"),
  printingPieceId: document.querySelector("#printingPieceId"),
  printingPieceName: document.querySelector("#printingPieceName"),
  printingPieceQty: document.querySelector("#printingPieceQty"),
  printingPieceWeight: document.querySelector("#printingPieceWeight"),
  printingPieceHours: document.querySelector("#printingPieceHours"),
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
  monthlyCurrency: document.querySelector("#monthlyCurrency"),
  monthlyCostFormMessage: document.querySelector("#monthlyCostFormMessage"),
  saveMonthlyCostBtn: document.querySelector("#saveMonthlyCostBtn"),
  cancelMonthlyCostEditBtn: document.querySelector("#cancelMonthlyCostEditBtn"),
  monthlyCostsTableBody: document.querySelector("#monthlyCostsTableBody"),
  monthlyFixedCosts: document.querySelector("#monthlyFixedCosts"),
  monthlyEquivalentHeading: document.querySelector("#monthlyEquivalentHeading"),
  monthlyFixedCostsHeading: document.querySelector("#monthlyFixedCostsHeading"),
  currencySettingsForm: document.querySelector("#currencySettingsForm"),
  displayCurrency: document.querySelector("#displayCurrency"),
  usdArsRate: document.querySelector("#usdArsRate"),
  rateUpdatedAt: document.querySelector("#rateUpdatedAt"),
  currencySettingsMessage: document.querySelector("#currencySettingsMessage"),
  currencyStatus: document.querySelector("#currencyStatus"),

  purchaseItemForm: document.querySelector("#purchaseItemForm"),
  purchaseItemId: document.querySelector("#purchaseItemId"),
  purchaseSourceSelect: document.querySelector("#purchaseSourceSelect"),
  purchaseSourceDetails: document.querySelector("#purchaseSourceDetails"),
  purchaseItemQuantity: document.querySelector("#purchaseItemQuantity"),
  purchaseItemFormMessage: document.querySelector("#purchaseItemFormMessage"),
  savePurchaseItemBtn: document.querySelector("#savePurchaseItemBtn"),
  cancelPurchaseItemEditBtn: document.querySelector("#cancelPurchaseItemEditBtn"),
  purchaseItemsTableBody: document.querySelector("#purchaseItemsTableBody"),
  purchaseEquivalentHeading: document.querySelector("#purchaseEquivalentHeading"),
  purchaseListTotalHeading: document.querySelector("#purchaseListTotalHeading"),
  purchaseListTotal: document.querySelector("#purchaseListTotal"),
  purchaseCurrencyStatus: document.querySelector("#purchaseCurrencyStatus"),

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

const purchaseQuantityFormatter = new Intl.NumberFormat("es-AR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 6,
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

function listLocalStorageKeys() {
  const keys = [];

  try {
    const storage = globalThis.localStorage;

    if (!storage) {
      return keys;
    }

    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);

      if (key) {
        keys.push(key);
      }
    }
  } catch (error) {
    console.warn(`${STORAGE_LOG_PREFIX} No se pudieron listar claves de localStorage.`, error);
  }

  return keys;
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

function parseJsonForRecovery(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function logStorageInfo(message, data) {
  if (data === undefined) {
    console.info(`${STORAGE_LOG_PREFIX} ${message}`);
    return;
  }

  console.info(`${STORAGE_LOG_PREFIX} ${message}`, data);
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

function rawStringValue(value) {
  return String(value ?? "");
}

function firstPresentValue(values) {
  return values.find((value) => value !== undefined && value !== null);
}

function makeId(prefix = "record") {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMoney(value) {
  if (!Number.isFinite(value)) {
    return "Configurar USD/ARS";
  }

  const targetCurrency = state.currencySettings.displayCurrency;
  const minorUnits = CURRENCY.convertAmountToMinorUnits(
    value,
    "ARS",
    targetCurrency,
    state.currencySettings.usdArsRate,
  );
  return formatMoneyMinorUnits(minorUnits, targetCurrency);
}

function formatMoneyOriginal(value, currencyCode) {
  return formatMoneyMinorUnits(CURRENCY.toMinorUnits(value), currencyCode);
}

function formatMoneyMinorUnits(minorUnits, currencyCode) {
  if (minorUnits === null) {
    return "Configurar USD/ARS";
  }

  const absolute = minorUnits < 0n ? -minorUnits : minorUnits;
  const whole = (absolute / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const cents = (absolute % 100n).toString().padStart(2, "0");
  const prefix = minorUnits < 0n ? "- " : "";
  return `${prefix}${currencyCode} ${whole},${cents}`;
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

function formatPurchaseQuantity(value) {
  const number = toNumber(value);
  return Number.isFinite(number) ? purchaseQuantityFormatter.format(number) : stringValue(value);
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
  const printHours = nonNegativeNumber(piece?.printHours);

  return {
    totalGrams,
    baseCost: totalGrams * pricePerGram,
    printHours,
  };
}

function calculateMonthlyEquivalent(cost, targetCurrency = state.currencySettings.displayCurrency) {
  const minorUnits = CURRENCY.monthlyEquivalentMinorUnits(
    cost,
    targetCurrency,
    state.currencySettings.usdArsRate,
  );
  return minorUnits === null ? null : CURRENCY.minorUnitsToNumber(minorUnits);
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
      printHours: result.printHours,
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
  const printingElectricityCostPerBox = nonNegativeNumber(
    current.printing.electricityCostPerBox,
  );
  const printingTotal =
    printingBaseCost + printingWasteCost + printingElectricityCostPerBox;
  const printingTotalGrams = printingPieces.reduce(
    (total, piece) => total + piece.totalGrams,
    0,
  );
  const printingTotalHours = printingPieces.reduce(
    (total, piece) => total + piece.printHours,
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

  const monthlyFixedCostsMinorUnits = CURRENCY.sumMonthlyCostsMinorUnits(
    current.monthlyCosts,
    "ARS",
    current.currencySettings.usdArsRate,
  );
  const monthlyFixedCosts = monthlyFixedCostsMinorUnits === null
    ? null
    : CURRENCY.minorUnitsToNumber(monthlyFixedCostsMinorUnits);
  const monthlyFixedCostsDisplayMinorUnits = CURRENCY.sumMonthlyCostsMinorUnits(
    current.monthlyCosts,
    current.currencySettings.displayCurrency,
    current.currencySettings.usdArsRate,
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
  const estimatedResult = monthlyFixedCosts === null
    ? null
    : contributionTotal - monthlyFixedCosts;

  return {
    hardwareTotal,
    filamentPricePerGram,
    printingPieces,
    printingPiecesBaseCost,
    migratedPrintingCost,
    printingBaseCost,
    printingWastePercent,
    printingWasteCost,
    printingElectricityCostPerBox,
    printingTotal,
    printingTotalGrams,
    printingTotalHours,
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
    monthlyFixedCostsDisplayMinorUnits,
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
  if (monthlyFixedCosts === null) {
    return {
      units: null,
      message: "Configura el tipo de cambio USD/ARS para calcular los costos fijos mensuales.",
    };
  }

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
    data.version === 2 ||
    Boolean(data.printing) ||
    Boolean(data.supplies) ||
    Boolean(data.labor) ||
    Boolean(data.packaging) ||
    Boolean(data.monthlyCosts) ||
    Boolean(data.purchaseItems) ||
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
            printHours: stringValue(piece.printHours ?? piece.print_hours ?? piece.hours),
          }))
        : [],
      wastePercent: stringValue(data.printing?.wastePercent),
      electricityCostPerBox: stringValue(data.printing?.electricityCostPerBox),
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
    currencySettings: {
      displayCurrency: CURRENCY.normalizeCurrency(data.currencySettings?.displayCurrency),
      usdArsRate: stringValue(data.currencySettings?.usdArsRate),
      rateUpdatedAt: stringValue(data.currencySettings?.rateUpdatedAt),
    },
    monthlyCosts: Array.isArray(data.monthlyCosts)
      ? data.monthlyCosts.map((cost) => ({
          id: stringValue(cost.id) || makeId("monthly"),
          concept: stringValue(cost.concept),
          category: monthlyCategories.has(cost.category) ? cost.category : "Otros",
          amount: stringValue(cost.amount),
          currency: CURRENCY.normalizeCurrency(cost.currency),
          periodicity: periodicities.has(cost.periodicity)
            ? cost.periodicity
            : "monthly",
        }))
      : [],
    purchaseItems: Array.isArray(data.purchaseItems)
      ? data.purchaseItems.map((item) => ({
          id: stringValue(item.id) || makeId("purchase"),
          componentId: stringValue(item.componentId),
          sourceType: ["hardware", "supplies", "packaging", "filament"].includes(item.sourceType)
            ? item.sourceType
            : stringValue(item.componentId) ? "hardware" : "",
          sourceId: stringValue(item.sourceId || item.componentId),
          sourceCategory: stringValue(item.sourceCategory),
          name: stringValue(item.name),
          quantity: stringValue(item.quantity),
          unit: stringValue(item.unit),
          unitPrice: stringValue(item.unitPrice),
          currency: CURRENCY.normalizeCurrency(item.currency),
          supplier: stringValue(item.supplier),
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

function normalizeRecoveredComponent(component) {
  const name = firstPresentValue([
    component?.name,
    component?.nombre,
    component?.component,
    component?.componente,
  ]);
  const quantity = firstPresentValue([
    component?.quantity,
    component?.cantidad,
    component?.qty,
  ]);
  const unitPrice = firstPresentValue([
    component?.unitPrice,
    component?.precioUnitario,
    component?.unit_price,
    component?.price,
    component?.precio,
  ]);
  const supplier = firstPresentValue([
    component?.supplier,
    component?.proveedor,
    component?.provider,
  ]);

  return {
    id: rawStringValue(component?.id) || makeId("component"),
    name: rawStringValue(name),
    quantity: rawStringValue(quantity),
    unitPrice: rawStringValue(unitPrice),
    supplier: rawStringValue(supplier),
  };
}

function hasRecoverableComponentShape(component) {
  if (!component || typeof component !== "object") {
    return false;
  }

  const recovered = normalizeRecoveredComponent(component);

  return recovered.name.trim() !== "";
}

function extractComponentsFromStoredValue(parsedValue) {
  const data = parsedValue?.data ?? parsedValue;
  const candidateArrays = [
    Array.isArray(data) ? data : null,
    data?.components,
    data?.hardware,
    data?.hardwareComponents,
    data?.componentes,
    parsedValue?.components,
    parsedValue?.data?.components,
  ];
  const array = candidateArrays.find(
    (candidate) =>
      Array.isArray(candidate) && candidate.some(hasRecoverableComponentShape),
  );

  if (!array) {
    return [];
  }

  return array
    .filter(hasRecoverableComponentShape)
    .map(normalizeRecoveredComponent);
}

function componentIdentity(component) {
  if (component.id) {
    return `id:${component.id}`;
  }

  return `fields:${componentFingerprint(component)}`;
}

function componentFingerprint(component) {
  return [
    rawStringValue(component.name).trim().toLowerCase(),
    rawStringValue(component.quantity),
    rawStringValue(component.unitPrice),
    rawStringValue(component.supplier),
  ].join("|");
}

function recordFingerprint(record, fields) {
  return fields
    .map((field) => rawStringValue(record?.[field]).trim().toLowerCase())
    .join("|");
}

function findRawMonthlyCost(rawCosts, normalizedCost) {
  const costs = Array.isArray(rawCosts) ? rawCosts : [];
  const byId = normalizedCost.id
    ? costs.find((cost) => stringValue(cost.id) === normalizedCost.id)
    : null;

  if (byId) {
    return byId;
  }

  return costs.find((cost) =>
    ["concept", "category", "amount", "periodicity"].every(
      (field) => stringValue(cost[field]) === stringValue(normalizedCost[field]),
    ),
  );
}

function isBlankValue(value) {
  return value === undefined || value === null || rawStringValue(value).trim() === "";
}

function choosePresentValue(primary, secondary) {
  return isBlankValue(primary) && !isBlankValue(secondary) ? secondary : primary;
}

function mergeRecord(primary, secondary, fields) {
  const merged = { ...primary };
  let changed = false;

  fields.forEach((field) => {
    const nextValue = choosePresentValue(merged[field], secondary?.[field]);

    if (nextValue !== merged[field]) {
      merged[field] = nextValue;
      changed = true;
    }
  });

  return { changed, record: merged };
}

function mergeRecordList(primaryList, secondaryList, options) {
  const { identityFields, mergeFields } = options;
  const list = primaryList.map((item) => ({ ...item }));
  const indexById = new Map();
  const indexByFingerprint = new Map();
  const report = {
    added: 0,
    merged: 0,
  };

  list.forEach((item, index) => {
    if (item.id) {
      indexById.set(item.id, index);
    }

    indexByFingerprint.set(recordFingerprint(item, identityFields), index);
  });

  secondaryList.forEach((item) => {
    const fingerprint = recordFingerprint(item, identityFields);
    const index = item.id && indexById.has(item.id)
      ? indexById.get(item.id)
      : indexByFingerprint.get(fingerprint);

    if (index === undefined) {
      list.push({ ...item });
      const newIndex = list.length - 1;

      if (item.id) {
        indexById.set(item.id, newIndex);
      }

      indexByFingerprint.set(fingerprint, newIndex);
      report.added += 1;
      return;
    }

    const merged = mergeRecord(list[index], item, mergeFields);

    if (merged.changed) {
      list[index] = merged.record;
      report.merged += 1;
    }
  });

  return {
    list,
    report,
    changed: report.added > 0 || report.merged > 0,
  };
}

function mergeObjectFields(primary, secondary, fields) {
  const merged = { ...primary };
  let changed = false;

  fields.forEach((field) => {
    const nextValue = choosePresentValue(merged[field], secondary?.[field]);

    if (nextValue !== merged[field]) {
      merged[field] = nextValue;
      changed = true;
    }
  });

  return { changed, object: merged };
}

function mergeStatesWithoutDataLoss(primaryState, secondaryState) {
  const primary = normalizeVersionTwoState(primaryState);

  if (!secondaryState) {
    return {
      changed: false,
      state: primary,
      report: {},
    };
  }

  const secondary = normalizeVersionTwoState(secondaryState);
  const merged = normalizeVersionTwoState(primary);
  const report = {};
  let changed = false;
  const rawPrimary = primaryState?.data ?? primaryState;
  const rawSecondary = secondaryState?.data ?? secondaryState;

  const components = mergeRecordList(merged.components, secondary.components, {
    identityFields: ["name", "quantity", "unitPrice", "supplier"],
    mergeFields: ["id", "name", "quantity", "unitPrice", "supplier"],
  });
  merged.components = components.list;
  report.components = components.report;
  changed = changed || components.changed;

  const printingPieces = mergeRecordList(merged.printing.pieces, secondary.printing.pieces, {
    identityFields: ["name", "quantity", "weightGrams"],
    mergeFields: ["id", "name", "quantity", "weightGrams", "printHours"],
  });
  merged.printing.pieces = printingPieces.list;
  report.printingPieces = printingPieces.report;
  changed = changed || printingPieces.changed;

  const supplies = mergeRecordList(merged.supplies, secondary.supplies, {
    identityFields: ["name", "quantity", "unit", "unitPrice", "supplier"],
    mergeFields: ["id", "name", "quantity", "unit", "unitPrice", "supplier"],
  });
  merged.supplies = supplies.list;
  report.supplies = supplies.report;
  changed = changed || supplies.changed;

  const labor = mergeRecordList(merged.labor, secondary.labor, {
    identityFields: ["name", "hours", "hourlyRate", "responsible"],
    mergeFields: ["id", "name", "hours", "hourlyRate", "responsible"],
  });
  merged.labor = labor.list;
  report.labor = labor.report;
  changed = changed || labor.changed;

  const packaging = mergeRecordList(merged.packaging, secondary.packaging, {
    identityFields: ["name", "quantity", "unitPrice", "supplier"],
    mergeFields: ["id", "name", "quantity", "unitPrice", "supplier"],
  });
  merged.packaging = packaging.list;
  report.packaging = packaging.report;
  changed = changed || packaging.changed;

  const monthlyCosts = mergeRecordList(merged.monthlyCosts, secondary.monthlyCosts, {
    identityFields: ["concept", "category", "amount", "currency", "periodicity"],
    mergeFields: ["id", "concept", "category", "amount", "currency", "periodicity"],
  });
  let keptExistingMonthlyCurrency = false;
  monthlyCosts.list.forEach((cost) => {
    const originalCost = findRawMonthlyCost(rawPrimary?.monthlyCosts, cost);
    const secondaryCost = findRawMonthlyCost(rawSecondary?.monthlyCosts, cost);

    if (
      originalCost
      && !Object.prototype.hasOwnProperty.call(originalCost, "currency")
      && secondaryCost
      && CURRENCY.normalizeCurrency(secondaryCost.currency) !== "ARS"
    ) {
      cost.currency = CURRENCY.normalizeCurrency(secondaryCost.currency);
      keptExistingMonthlyCurrency = true;
    }
  });
  merged.monthlyCosts = monthlyCosts.list;
  report.monthlyCosts = monthlyCosts.report;
  changed = changed || monthlyCosts.changed || keptExistingMonthlyCurrency;

  const purchaseItems = mergeRecordList(merged.purchaseItems, secondary.purchaseItems, {
    identityFields: ["sourceType", "sourceId", "name", "quantity", "unitPrice", "currency"],
    mergeFields: ["id", "componentId", "sourceType", "sourceId", "sourceCategory", "name", "quantity", "unit", "unitPrice", "currency", "supplier"],
  });
  merged.purchaseItems = purchaseItems.list;
  report.purchaseItems = purchaseItems.report;
  changed = changed || purchaseItems.changed;

  const filament = mergeObjectFields(merged.printing.filament, secondary.printing.filament, [
    "name",
    "spoolPrice",
    "spoolWeightGrams",
  ]);
  merged.printing.filament = filament.object;
  changed = changed || filament.changed;

  const printing = mergeObjectFields(merged.printing, secondary.printing, [
    "wastePercent",
    "electricityCostPerBox",
    "legacyManualCost",
  ]);
  merged.printing = {
    ...printing.object,
    filament: merged.printing.filament,
    pieces: merged.printing.pieces,
  };
  changed = changed || printing.changed;

  const adjustments = mergeObjectFields(merged.adjustments, secondary.adjustments, [
    "wastePercent",
    "warrantyPercent",
  ]);
  merged.adjustments = adjustments.object;
  changed = changed || adjustments.changed;

  const pricing = mergeObjectFields(merged.pricing, secondary.pricing, [
    "manualPrice",
    "targetMarkupPercent",
    "targetMarginPercent",
  ]);
  merged.pricing = pricing.object;
  if (isBlankValue(primary.pricing?.mode) && !isBlankValue(secondary.pricing?.mode)) {
    merged.pricing.mode = secondary.pricing.mode;
    changed = true;
  }
  changed = changed || pricing.changed;

  if (!positiveQuantity(merged.simulator.quantity) && positiveQuantity(secondary.simulator.quantity)) {
    merged.simulator.quantity = secondary.simulator.quantity;
    changed = true;
  }

  const legacyCosts = mergeObjectFields(merged.legacyCosts, secondary.legacyCosts, [
    "caseCost",
    "laborCost",
    "otherCost",
  ]);
  merged.legacyCosts = legacyCosts.object;
  changed = changed || legacyCosts.changed;

  if (!rawPrimary?.currencySettings && rawSecondary?.currencySettings) {
    merged.currencySettings = secondary.currencySettings;
    changed = true;
  } else {
    const currencySettings = mergeObjectFields(
      merged.currencySettings,
      secondary.currencySettings,
      ["displayCurrency", "usdArsRate", "rateUpdatedAt"],
    );
    merged.currencySettings = currencySettings.object;
    changed = changed || currencySettings.changed;
  }

  return {
    changed,
    state: merged,
    report,
  };
}

function stateNeedsCloudMigration(rawState) {
  const data = rawState?.data ?? rawState;

  if (!data || typeof data !== "object") {
    return false;
  }

  if (!isVersionTwoState(data)) {
    return true;
  }

  return data.version !== CURRENT_VERSION
    || !data.currencySettings
    || !Array.isArray(data.purchaseItems)
    || (Array.isArray(data.monthlyCosts)
      && data.monthlyCosts.some((cost) => !Object.prototype.hasOwnProperty.call(cost, "currency")))
    || (Array.isArray(data.printing?.pieces)
      && data.printing.pieces.some((piece) => !Object.prototype.hasOwnProperty.call(piece, "printHours")));
}

function preserveCloudMergeBackup(localRawState, cloudRawState, report) {
  if (!localRawState && !cloudRawState) {
    return;
  }

  const existingBackup = parseJsonForRecovery(readLocalStorage(CLOUD_MERGE_BACKUP_KEY));
  const backup = existingBackup && typeof existingBackup === "object"
    ? existingBackup
    : {
        type: "green-box-cloud-merge-backup",
        version: 1,
        sources: [],
      };
  const sourceId = `${rawHash(localRawState)}:${rawHash(cloudRawState)}`;
  const existingHashes = new Set(
    Array.isArray(backup.sources)
      ? backup.sources.map((source) => source.sourceId)
      : [],
  );

  if (!Array.isArray(backup.sources)) {
    backup.sources = [];
  }

  if (existingHashes.has(sourceId)) {
    return;
  }

  backup.sources.push({
    sourceId,
    capturedAt: new Date().toISOString(),
    report,
    localRawState,
    cloudRawState,
  });
  writeLocalStorage(CLOUD_MERGE_BACKUP_KEY, JSON.stringify(backup));
}

function rawHash(value) {
  let hash = 0;
  const text = rawStringValue(value);

  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16);
}

function findHardwareRecoveryCandidates() {
  const discoveredKeys = listLocalStorageKeys();
  const priorityKeys = [LEGACY_BACKUP_KEY, STORAGE_KEY, HARDWARE_RECOVERY_BACKUP_KEY];
  const orderedKeys = [
    ...priorityKeys.filter((key) => discoveredKeys.includes(key)),
    ...discoveredKeys.filter((key) => !priorityKeys.includes(key)),
  ];

  logStorageInfo("Claves de almacenamiento encontradas:", discoveredKeys);

  const candidates = orderedKeys
    .map((key) => {
      const raw = readLocalStorage(key);
      const parsed = parseJsonForRecovery(raw);
      const components = extractComponentsFromStoredValue(parsed);

      return {
        key,
        raw,
        rawHash: rawHash(raw),
        components,
      };
    })
    .filter((candidate) => candidate.components.length > 0);

  if (candidates.length === 0) {
    logStorageInfo("No se encontraron datos antiguos de hardware recuperables.");
  } else {
    logStorageInfo(
      "Fuentes con hardware recuperable:",
      candidates.map((candidate) => ({
        key: candidate.key,
        components: candidate.components.length,
      })),
    );
  }

  return candidates;
}

function preserveHardwareRecoveryBackup(candidates) {
  if (candidates.length === 0) {
    return;
  }

  const existingBackup = parseJsonForRecovery(readLocalStorage(HARDWARE_RECOVERY_BACKUP_KEY));
  const backup = existingBackup && typeof existingBackup === "object"
    ? existingBackup
    : {
        type: "green-box-hardware-recovery-backup",
        version: 1,
        sources: [],
      };
  const existingHashes = new Set(
    Array.isArray(backup.sources)
      ? backup.sources.map((source) => `${source.key}:${source.rawHash}`)
      : [],
  );

  if (!Array.isArray(backup.sources)) {
    backup.sources = [];
  }

  candidates.forEach((candidate) => {
    const sourceId = `${candidate.key}:${candidate.rawHash}`;

    if (existingHashes.has(sourceId)) {
      return;
    }

    backup.sources.push({
      key: candidate.key,
      rawHash: candidate.rawHash,
      componentCount: candidate.components.length,
      capturedAt: new Date().toISOString(),
      rawValue: candidate.raw,
    });
    existingHashes.add(sourceId);
  });

  writeLocalStorage(HARDWARE_RECOVERY_BACKUP_KEY, JSON.stringify(backup));
}

function recoverStoredHardware(normalizedState) {
  const candidates = findHardwareRecoveryCandidates();
  const existingIds = new Set(
    normalizedState.components
      .map((component) => component.id)
      .filter(Boolean),
  );
  const existingFingerprints = new Set(
    normalizedState.components.map(componentFingerprint),
  );
  const recoveredComponents = [];

  candidates.forEach((candidate) => {
    candidate.components.forEach((component) => {
      const fingerprint = componentFingerprint(component);

      if (
        (component.id && existingIds.has(component.id)) ||
        existingFingerprints.has(fingerprint)
      ) {
        return;
      }

      if (component.id) {
        existingIds.add(component.id);
      }

      existingFingerprints.add(fingerprint);
      recoveredComponents.push(component);
    });
  });

  if (recoveredComponents.length === 0) {
    logStorageInfo("No hubo migracion de hardware; no habia componentes nuevos para copiar.");
    return {
      recoveredCount: 0,
      state: normalizedState,
    };
  }

  preserveHardwareRecoveryBackup(candidates);
  normalizedState.components = [...normalizedState.components, ...recoveredComponents];
  logStorageInfo("Migracion de hardware ejecutada.", {
    recoveredCount: recoveredComponents.length,
    finalComponentCount: normalizedState.components.length,
  });

  return {
    recoveredCount: recoveredComponents.length,
    state: normalizedState,
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
    const recovery = recoverStoredHardware(createDefaultState());

    if (recovery.recoveredCount > 0) {
      applyImportedState(recovery.state);
      migrationNotice =
        "Se recuperaron componentes de hardware desde datos guardados anteriormente.";
      writeLocalStorage(STORAGE_KEY, JSON.stringify(state));
    }

    return;
  }

  try {
    const shouldMigrate = stateNeedsCloudMigration(savedState);
    const normalizedState = normalizeImportedState(savedState);
    const recovery = recoverStoredHardware(normalizedState);

    if (shouldMigrate && rawState) {
      if (!readLocalStorage(LEGACY_BACKUP_KEY)) {
        writeLocalStorage(LEGACY_BACKUP_KEY, rawState);
      }

      migrationNotice =
        "Datos anteriores migrados a la estructura nueva. Se guardo una copia de respaldo local.";
    }

    if (recovery.recoveredCount > 0) {
      migrationNotice =
        "Se recuperaron componentes de hardware desde datos guardados anteriormente.";
    }

    applyImportedState(recovery.state);

    if (shouldMigrate || recovery.recoveredCount > 0) {
      writeLocalStorage(STORAGE_KEY, JSON.stringify(state));
    }
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
    const cloudNeedsMigration = stateNeedsCloudMigration(response.data);
    const localRawState = readLocalStorage(STORAGE_KEY);
    const parsedLocalState = parseJsonSafely(localRawState, STORAGE_KEY);
    let normalizedLocalState = null;

    if (parsedLocalState) {
      try {
        normalizedLocalState = normalizeImportedState(parsedLocalState);
      } catch (error) {
        console.warn("No se pudo normalizar la copia local para fusionar con Neon.", error);
      }
    }

    const merge = mergeStatesWithoutDataLoss(
      response.data,
      normalizedLocalState ? parsedLocalState : null,
    );

    if (merge.changed || cloudNeedsMigration) {
      preserveCloudMergeBackup(
        localRawState,
        JSON.stringify(response.data || {}),
        {
          cloudNeedsMigration,
          ...merge.report,
        },
      );
      logStorageInfo("Fusion local/Neon preparada:", {
        cloudNeedsMigration,
        report: merge.report,
      });
    }

    applyImportedState(merge.state);
    storageMode = "cloud";
    writeLocalStorage(STORAGE_KEY, JSON.stringify(state));
    render();

    if (merge.changed || cloudNeedsMigration) {
      setStorageStatus("Migrando a Neon...", "cloud");
      await apiRequest("/api/state", {
        method: "PUT",
        body: JSON.stringify({ data: state }),
      });
      setStorageStatus("Conectado a Neon", "cloud");
      setBackupStatus("Datos consolidados en Neon sin borrar la copia local.");
      return;
    }

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

  snapshotPurchaseSource("hardware", id);
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

  state.components.forEach((component) => snapshotPurchaseSource("hardware", component.id));
  state.components = [];
  resetComponentForm();
  saveAndRender();
}

function snapshotPurchaseSource(sourceType, sourceId) {
  const source = getPurchaseCatalog().find(
    (item) => item.sourceType === sourceType && item.sourceId === sourceId,
  );

  if (!source) return;

  state.purchaseItems.forEach((item) => {
    const itemType = item.sourceType || (item.componentId ? "hardware" : "");
    const itemSourceId = item.sourceId || item.componentId;
    if (itemType !== sourceType || itemSourceId !== sourceId) return;

    item.sourceCategory = source.sourceCategory;
    item.name = source.name;
    item.unit = source.unit;
    item.unitPrice = source.unitPrice;
    item.currency = source.currency;
    item.supplier = source.supplier;
  });
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
    validateNumber(elements.printingPieceHours.value, {
      label: "Las horas de impresion",
      min: 0,
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
    printHours: stringValue(elements.printingPieceHours.value),
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
  elements.printingPieceHours.value = piece.printHours;
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
  elements.printingPieceHours.value = "";
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

  snapshotPurchaseSource("supplies", id);
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

  snapshotPurchaseSource("packaging", id);
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
    currency: CURRENCY.normalizeCurrency(elements.monthlyCurrency.value),
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
  elements.monthlyCurrency.value = cost.currency;
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
  elements.monthlyCurrency.value = "ARS";
  elements.saveMonthlyCostBtn.textContent = "Agregar costo";
  elements.cancelMonthlyCostEditBtn.classList.add("hidden");
  setFormMessage(elements.monthlyCostFormMessage, "", false);
}

function upsertPurchaseItem(event) {
  event.preventDefault();

  const sourceKey = stringValue(elements.purchaseSourceSelect.value);
  const source = getPurchaseCatalog().find((item) => item.key === sourceKey);
  const quantity = stringValue(elements.purchaseItemQuantity.value);
  const duplicateSource = state.purchaseItems.some((item) =>
    (item.sourceType || (item.componentId ? "hardware" : "")) === source?.sourceType
      && (item.sourceId || item.componentId) === source?.sourceId
      && item.id !== elements.purchaseItemId.value,
  );
  const error = firstValidationError([
    source ? "" : "Elegí un elemento existente del catálogo.",
    duplicateSource ? "Este elemento ya está en la lista. Editá la fila existente para cambiar la cantidad." : "",
    validateNumber(quantity, {
      label: "La cantidad",
      required: true,
      min: 0,
      exclusiveMin: true,
    }),
    !CURRENCY.parseDecimal(quantity) ? "La cantidad debe ser un decimal válido." : "",
    source
      ? validateNumber(source.unitPrice, {
          label: "El precio del componente",
          required: true,
          min: 0,
        })
      : "",
    source && !CURRENCY.parseDecimal(source.unitPrice)
      ? "El elemento no tiene un precio válido. Actualizalo en su catálogo."
      : "",
  ]);

  if (error) {
    setFormMessage(elements.purchaseItemFormMessage, error);
    return;
  }

  upsertListItem(state.purchaseItems, {
    id: elements.purchaseItemId.value || makeId("purchase"),
    componentId: source.sourceType === "hardware" ? source.sourceId : "",
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    sourceCategory: source.sourceCategory,
    name: source.name,
    quantity,
    unit: source.unit,
    unitPrice: stringValue(source.unitPrice),
    currency: source.currency,
    supplier: stringValue(source.supplier),
  });

  resetPurchaseItemForm();
  saveAndRender();
}

function editPurchaseItem(id) {
  const item = state.purchaseItems.find((entry) => entry.id === id);

  if (!item) {
    return;
  }

  elements.purchaseItemId.value = item.id;
  renderPurchaseSourceOptions();
  const sourceType = item.sourceType || (item.componentId ? "hardware" : "");
  const sourceId = item.sourceId || item.componentId;
  const source = getPurchaseCatalog().find(
    (entry) => entry.sourceType === sourceType && entry.sourceId === sourceId,
  );
  elements.purchaseSourceSelect.value = source?.key || "";
  elements.purchaseItemQuantity.value = item.quantity;
  renderPurchaseSourceDetails();
  elements.savePurchaseItemBtn.textContent = "Guardar cambios";
  elements.cancelPurchaseItemEditBtn.classList.remove("hidden");
  setFormMessage(
    elements.purchaseItemFormMessage,
    sourceType && !source
      ? `El elemento original ya no está en ${item.sourceCategory || purchaseSourceCategory(sourceType)}. Elegí uno disponible para actualizar esta compra.`
      : !sourceType
        ? "Este registro anterior no está vinculado a un catálogo. Elegí un elemento para reemplazarlo."
        : "",
    Boolean(!source),
  );
  elements.purchaseSourceSelect.focus();
}

function deletePurchaseItem(id) {
  if (!window.confirm("¿Seguro que querés eliminar esta compra de la lista?")) {
    return;
  }

  deleteListItem(state.purchaseItems, id);
  saveAndRender();
}

function resetPurchaseItemForm() {
  elements.purchaseItemId.value = "";
  elements.purchaseSourceSelect.value = "";
  elements.purchaseItemQuantity.value = "";
  renderPurchaseSourceOptions();
  renderPurchaseSourceDetails();
  elements.savePurchaseItemBtn.textContent = "Agregar compra";
  elements.cancelPurchaseItemEditBtn.classList.add("hidden");
  setFormMessage(elements.purchaseItemFormMessage, "", false);
}

function resetAllForms() {
  resetComponentForm();
  resetPrintingPieceForm();
  resetSupplyForm();
  resetLaborForm();
  resetPackagingForm();
  resetMonthlyCostForm();
  resetPurchaseItemForm();
  setFormMessage(elements.printingConfigMessage, "", false);
  setFormMessage(elements.adjustmentsMessage, "", false);
  setFormMessage(elements.pricingMessage, "", false);
  setFormMessage(elements.simulatorMessage, "", false);
}

function saveAndRender() {
  saveState();
  render();
}

function saveCurrencySettings(event) {
  event.preventDefault();

  const rate = stringValue(elements.usdArsRate.value);
  const parsedRate = CURRENCY.parseDecimal(rate);
  const error = firstValidationError([
    validateNumber(rate, {
      label: "El tipo de cambio",
      min: 0,
      exclusiveMin: true,
    }),
    rate && !elements.rateUpdatedAt.value
      ? "Indicá la fecha de actualización del tipo de cambio."
      : "",
    rate && (!parsedRate || parsedRate.coefficient <= 0n)
      ? "El tipo de cambio debe ser un decimal positivo válido."
      : "",
  ]);

  if (error) {
    setFormMessage(elements.currencySettingsMessage, error);
    return;
  }

  state.currencySettings = {
    displayCurrency: CURRENCY.normalizeCurrency(elements.displayCurrency.value),
    usdArsRate: rate,
    rateUpdatedAt: rate ? stringValue(elements.rateUpdatedAt.value) : "",
  };
  setFormMessage(elements.currencySettingsMessage, "Configuración guardada.", false);
  saveAndRender();
}

function updateFilamentField(field, value) {
  if (field === "name" && !stringValue(value).trim()) {
    snapshotPurchaseSource("filament", "filament");
  }
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

function updatePrintingElectricityCost(value) {
  const error = validateNumber(value, {
    label: "El costo de luz por box",
    min: 0,
  });

  if (error) {
    setFormMessage(elements.printingConfigMessage, error);
    return;
  }

  state.printing.electricityCostPerBox = stringValue(value);
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
  renderCurrencyStatus();
  renderMigrationStatus();
}

function syncInputs() {
  elements.filamentName.value = state.printing.filament.name;
  elements.filamentSpoolPrice.value = state.printing.filament.spoolPrice;
  elements.filamentSpoolWeight.value = state.printing.filament.spoolWeightGrams;
  elements.printingWastePercent.value = state.printing.wastePercent;
  elements.printingElectricityCostInput.value = state.printing.electricityCostPerBox;
  elements.generalWastePercent.value = state.adjustments.wastePercent;
  elements.warrantyPercent.value = state.adjustments.warrantyPercent;
  elements.manualSalePrice.value = state.pricing.manualPrice;
  elements.targetMarkupPercent.value = state.pricing.targetMarkupPercent;
  elements.targetMarginPercent.value = state.pricing.targetMarginPercent;
  elements.productionQty.value = state.simulator.quantity;
  elements.displayCurrency.value = state.currencySettings.displayCurrency;
  elements.usdArsRate.value = state.currencySettings.usdArsRate;
  elements.rateUpdatedAt.value = state.currencySettings.rateUpdatedAt;

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
  renderPurchaseItems();
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
      '<tr><td colspan="7" class="empty-row">Sin piezas cargadas.</td></tr>';
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
          <td>${piece.printHours === "" ? "-" : formatQuantity(nonNegativeNumber(piece.printHours), "h")}</td>
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
          <td>${formatMoneyOriginal(cost.amount, cost.currency)}</td>
          <td><strong>${formatMoneyMinorUnits(
            CURRENCY.monthlyEquivalentMinorUnits(
              cost,
              state.currencySettings.displayCurrency,
              state.currencySettings.usdArsRate,
            ),
            state.currencySettings.displayCurrency,
          )}</strong></td>
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

function purchaseSourceCategory(sourceType) {
  return {
    hardware: "Hardware",
    supplies: "Insumos",
    packaging: "Packaging",
    filament: "Impresión 3D",
  }[sourceType] || "catálogo";
}

function getPurchaseCatalog() {
  const sources = [
    ...state.components.map((item) => ({
      sourceType: "hardware",
      sourceId: item.id,
      sourceCategory: "Hardware",
      name: item.name,
      unit: "unidad",
      unitPrice: item.unitPrice,
      currency: "ARS",
      supplier: item.supplier,
    })),
    ...state.supplies.map((item) => ({
      sourceType: "supplies",
      sourceId: item.id,
      sourceCategory: "Insumos",
      name: item.name,
      unit: item.unit || "unidad",
      unitPrice: item.unitPrice,
      currency: "ARS",
      supplier: item.supplier,
    })),
    ...state.packaging.map((item) => ({
      sourceType: "packaging",
      sourceId: item.id,
      sourceCategory: "Packaging",
      name: item.name,
      unit: "unidad",
      unitPrice: item.unitPrice,
      currency: "ARS",
      supplier: item.supplier,
    })),
  ];

  if (stringValue(state.printing.filament.name).trim()) {
    sources.push({
      sourceType: "filament",
      sourceId: "filament",
      sourceCategory: "Impresión 3D",
      name: state.printing.filament.name,
      unit: "rollo",
      unitPrice: state.printing.filament.spoolPrice,
      currency: "ARS",
      supplier: "",
    });
  }

  return sources.map((source) => ({
    ...source,
    key: JSON.stringify([source.sourceType, source.sourceId]),
  }));
}

function resolvePurchaseItem(item) {
  const sourceType = item.sourceType || (item.componentId ? "hardware" : "");
  const sourceId = item.sourceId || item.componentId;
  const source = getPurchaseCatalog().find(
    (entry) => entry.sourceType === sourceType && entry.sourceId === sourceId,
  );

  return source
    ? { ...item, ...source, sourceAvailable: true }
    : {
        ...item,
        sourceType,
        sourceCategory: item.sourceCategory || purchaseSourceCategory(sourceType),
        name: item.name || "Elemento sin nombre",
        currency: CURRENCY.normalizeCurrency(item.currency),
        supplier: item.supplier || "",
        sourceAvailable: false,
      };
}

function renderPurchaseSourceOptions() {
  const sources = getPurchaseCatalog();
  const selectedKey = stringValue(elements.purchaseSourceSelect.value);
  const editingItem = state.purchaseItems.find(
    (item) => item.id === elements.purchaseItemId.value,
  );
  const itemType = editingItem?.sourceType || (editingItem?.componentId ? "hardware" : "");
  const itemSourceId = editingItem?.sourceId || editingItem?.componentId;
  const previousSelection = selectedKey || (editingItem && sources.find(
    (source) => source.sourceType === itemType && source.sourceId === itemSourceId,
  )?.key) || "";
  const missingSource = editingItem && itemType && !sources.some(
    (source) => source.sourceType === itemType && source.sourceId === itemSourceId,
  );
  const placeholder = sources.length > 0
    ? "Seleccioná un elemento"
    : "Primero cargá elementos en un catálogo";
  const missingOption = missingSource
    ? `<option value="" disabled>${escapeHtml(editingItem.name || "Elemento")}
      (ya no está en ${escapeHtml(editingItem.sourceCategory || purchaseSourceCategory(itemType))})</option>`
    : "";
  const groups = ["hardware", "supplies", "packaging", "filament"]
    .map((sourceType) => {
      const options = sources
        .filter((source) => source.sourceType === sourceType)
        .map((source) => {
          const name = source.name || "Elemento sin nombre";
          const unit = source.unit ? ` / ${source.unit}` : "";
          return `<option value="${escapeAttribute(source.key)}">${escapeHtml(name)} — ${formatMoneyOriginal(source.unitPrice, source.currency)}${escapeHtml(unit)}</option>`;
        })
        .join("");
      return options
        ? `<optgroup label="${purchaseSourceCategory(sourceType)}">${options}</optgroup>`
        : "";
    })
    .join("");

  elements.purchaseSourceSelect.innerHTML =
    `<option value="">${placeholder}</option>${missingOption}${groups}`;
  elements.purchaseSourceSelect.value = previousSelection;
  if (elements.purchaseSourceSelect.value !== previousSelection) {
    elements.purchaseSourceSelect.value = "";
  }
  elements.savePurchaseItemBtn.disabled = sources.length === 0;
}

function renderPurchaseSourceDetails() {
  const source = getPurchaseCatalog().find(
    (item) => item.key === elements.purchaseSourceSelect.value,
  );

  if (source) {
    const supplier = source.supplier ? ` · Proveedor: ${source.supplier}` : "";
    elements.purchaseSourceDetails.textContent =
      `${source.sourceCategory} · Precio actual: ${formatMoneyOriginal(source.unitPrice, source.currency)} por ${source.unit}${supplier}. Se actualiza desde ese catálogo.`;
    return;
  }

  const editingItem = state.purchaseItems.find(
    (item) => item.id === elements.purchaseItemId.value,
  );
  if (editingItem && (editingItem.name || editingItem.unitPrice)) {
    const snapshot = resolvePurchaseItem(editingItem);
    elements.purchaseSourceDetails.textContent =
      `Último dato guardado: ${snapshot.name} · ${formatMoneyOriginal(snapshot.unitPrice, snapshot.currency)}. Elegí un elemento de un catálogo para actualizar esta compra.`;
    return;
  }

  elements.purchaseSourceDetails.textContent = getPurchaseCatalog().length > 0
    ? "Elegí Hardware, Insumos, Packaging o el filamento cargado. El precio y proveedor se toman de su catálogo."
    : "Primero cargá hardware, insumos, packaging o el filamento en sus secciones; después podés seleccionarlos acá.";
}

function renderPurchaseItems() {
  renderPurchaseSourceOptions();
  renderPurchaseSourceDetails();

  const displayCurrency = state.currencySettings.displayCurrency;
  elements.purchaseEquivalentHeading.textContent = `Equivalente (${displayCurrency})`;
  elements.purchaseListTotalHeading.textContent = `Total estimado (${displayCurrency})`;

  if (state.purchaseItems.length === 0) {
    elements.purchaseItemsTableBody.innerHTML =
      '<tr><td colspan="8" class="empty-row">Todavía no agregaste compras.</td></tr>';
  } else {
    elements.purchaseItemsTableBody.innerHTML = state.purchaseItems
      .map((item) => {
        const resolvedItem = resolvePurchaseItem(item);
        const originalTotal = CURRENCY.purchaseItemOriginalTotalMinorUnits(resolvedItem);
        const equivalentTotal = CURRENCY.purchaseItemTotalMinorUnits(
          resolvedItem,
          displayCurrency,
          state.currencySettings.usdArsRate,
        );
        const hasSource = resolvedItem.sourceType && resolvedItem.sourceId;
        const missingSourceNotice = hasSource && !resolvedItem.sourceAvailable
          ? `<div class="muted-text">Ya no está en ${escapeHtml(resolvedItem.sourceCategory)}</div>`
          : "";

        return `
          <tr>
            <td><div class="record-name">${escapeHtml(resolvedItem.name)}</div>${missingSourceNotice}</td>
            <td>${escapeHtml(resolvedItem.sourceCategory || "—")}</td>
            <td>${escapeHtml(resolvedItem.supplier || "—")}</td>
            <td>${formatPurchaseQuantity(item.quantity)}${resolvedItem.unit ? ` ${escapeHtml(resolvedItem.unit)}` : ""}</td>
            <td>${formatMoneyOriginal(resolvedItem.unitPrice, resolvedItem.currency)}</td>
            <td>${formatMoneyMinorUnits(originalTotal, resolvedItem.currency)}</td>
            <td><strong>${formatMoneyMinorUnits(equivalentTotal, displayCurrency)}</strong></td>
            <td>
              <div class="row-actions">
                <button class="icon-button" type="button" data-action="edit-purchase-item" data-id="${escapeAttribute(item.id)}">Editar</button>
                <button class="icon-button danger" type="button" data-action="delete-purchase-item" data-id="${escapeAttribute(item.id)}">Borrar</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  const resolvedItems = state.purchaseItems.map(resolvePurchaseItem);
  const totalMinorUnits = CURRENCY.sumPurchaseItemsMinorUnits(
    resolvedItems,
    displayCurrency,
    state.currencySettings.usdArsRate,
  );
  elements.purchaseListTotal.textContent = formatMoneyMinorUnits(totalMinorUnits, displayCurrency);

  const needsExchangeRate = resolvedItems.some(
    (item) => CURRENCY.normalizeCurrency(item.currency) !== displayCurrency,
  );
  const rate = CURRENCY.parseDecimal(state.currencySettings.usdArsRate);
  const missingExchangeRate = needsExchangeRate && (!rate || rate.coefficient <= 0n);

  if (totalMinorUnits === null) {
    elements.purchaseCurrencyStatus.textContent = missingExchangeRate
      ? "Para convertir y sumar compras en monedas distintas, configurá el tipo de cambio en Negocio → Costos mensuales."
      : "Revisá que todas las compras tengan una cantidad y un precio válidos para calcular el total.";
    elements.purchaseCurrencyStatus.classList.remove("hidden");
  } else {
    elements.purchaseCurrencyStatus.textContent = "";
    elements.purchaseCurrencyStatus.classList.add("hidden");
  }
}

function renderSummary(summary) {
  const isLoss = summary.contributionPerUnit < 0;

  elements.summaryUnitCost.textContent = formatMoney(summary.variableUnitCost);
  elements.summarySalePrice.textContent = formatMoney(summary.salePrice);
  elements.summaryProfit.textContent = formatMoney(summary.contributionPerUnit);
  elements.summaryMargin.textContent = formatPercent(summary.marginPercent);
  elements.summaryFixedCosts.textContent = formatMoneyMinorUnits(
    summary.monthlyFixedCostsDisplayMinorUnits,
    state.currencySettings.displayCurrency,
  );
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
  elements.monthlyFixedCosts.textContent = formatMoneyMinorUnits(
    summary.monthlyFixedCostsDisplayMinorUnits,
    state.currencySettings.displayCurrency,
  );
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
  elements.printingTotalHours.textContent = formatQuantity(summary.printingTotalHours, "h");
  elements.printingBaseCost.textContent = formatMoney(summary.printingBaseCost);
  elements.printingWasteCost.textContent = formatMoney(summary.printingWasteCost);
  elements.printingElectricityTotal.textContent = formatMoney(
    summary.printingElectricityCostPerBox,
  );
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
  const isLoss = Number.isFinite(summary.estimatedResult) && summary.estimatedResult < 0;

  elements.simulatorUnits.textContent = formatQuantity(summary.simulatorQuantity);
  elements.requiredInvestment.textContent = formatMoney(summary.requiredInvestment);
  elements.simulatorVariableTotal.textContent = formatMoney(summary.simulatorVariableTotal);
  elements.estimatedRevenue.textContent = formatMoney(summary.estimatedRevenue);
  elements.estimatedContribution.textContent = formatMoney(summary.estimatedContribution);
  elements.simulatorFixedCosts.textContent = formatMoneyMinorUnits(
    summary.monthlyFixedCostsDisplayMinorUnits,
    state.currencySettings.displayCurrency,
  );
  elements.estimatedProfit.textContent = summary.estimatedResult === null
    ? "Configurar USD/ARS"
    : isLoss
      ? `Perdida: ${formatMoney(summary.estimatedResult)}`
      : `Resultado positivo: ${formatMoney(summary.estimatedResult)}`;
  elements.estimatedProfit.classList.toggle("negative-text", isLoss);
  elements.estimatedProfit.classList.toggle(
    "positive-text",
    summary.estimatedResult !== null && !isLoss,
  );

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
  elements.breakEvenFixedCosts.textContent = formatMoneyMinorUnits(
    summary.monthlyFixedCostsDisplayMinorUnits,
    state.currencySettings.displayCurrency,
  );
  elements.breakEvenContribution.textContent = formatMoney(summary.contributionPerUnit);
}

function renderCurrencyStatus() {
  const { usdArsRate, rateUpdatedAt } = state.currencySettings;
  const displayCurrency = state.currencySettings.displayCurrency;
  elements.monthlyEquivalentHeading.textContent = `Equivalente mensual (${displayCurrency})`;
  elements.monthlyFixedCostsHeading.textContent = `Costos fijos mensuales (${displayCurrency})`;

  if (!CURRENCY.parseDecimal(usdArsRate) || Number(usdArsRate.replace(",", ".")) <= 0) {
    elements.currencyStatus.textContent =
      "Sin tipo de cambio configurado. Ingresá ARS por USD y la fecha para convertir importes y calcular los totales en una sola moneda.";
    elements.currencyStatus.classList.add("currency-status-warning");
    return;
  }

  elements.currencyStatus.textContent = `Tipo de cambio manual: 1 USD = ARS ${usdArsRate}${
    rateUpdatedAt ? ` · actualizado ${rateUpdatedAt}` : " · fecha no informada"
  }.`;
  elements.currencyStatus.classList.remove("currency-status-warning");
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
    "edit-purchase-item": editPurchaseItem,
    "delete-purchase-item": deletePurchaseItem,
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
  elements.printingElectricityCostInput.addEventListener("input", (event) => {
    updatePrintingElectricityCost(event.target.value);
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
  elements.currencySettingsForm.addEventListener("submit", saveCurrencySettings);

  elements.purchaseItemForm.addEventListener("submit", upsertPurchaseItem);
  elements.cancelPurchaseItemEditBtn.addEventListener("click", resetPurchaseItemForm);
  elements.purchaseItemsTableBody.addEventListener("click", handleTableAction);
  elements.purchaseSourceSelect.addEventListener("change", () => {
    renderPurchaseSourceDetails();
    setFormMessage(elements.purchaseItemFormMessage, "", false);
  });

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
    mergeStatesWithoutDataLoss,
    stateNeedsCloudMigration,
    createDefaultState,
    formatMoney,
  };
}

loadState();
bindEvents();
exposeTestApi();
render();
connectCloudStorage();
