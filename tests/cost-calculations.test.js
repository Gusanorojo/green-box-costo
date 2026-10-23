const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const currency = require("../currency");
const sourcePath = path.join(__dirname, "..", "script.js");
const source = fs.readFileSync(sourcePath, "utf8").replace(
  /loadState\(\);\s*bindEvents\(\);\s*exposeTestApi\(\);\s*render\(\);\s*connectCloudStorage\(\);\s*$/,
  "",
);
const sandbox = {
  GreenBoxCurrency: currency,
  document: {
    querySelector: () => ({}),
    querySelectorAll: () => [],
  },
  localStorage: { getItem: () => null },
  console,
};
vm.createContext(sandbox);
vm.runInContext(`${source}\nglobalThis.testApi = { createDefaultState, calculateFinancialSummary, calculateHardwareGroups, normalizeImportedState, mergeStatesWithoutDataLoss };`, sandbox);

function sampleState() {
  const state = sandbox.testApi.createDefaultState();
  state.components = [{ name: "Tornillos", quantity: "3", unitPrice: "100" }];
  state.printing.filament = { name: "PLA", spoolPrice: "10000", spoolWeightGrams: "1000" };
  state.printing.pieces = [{
    id: "pieza", name: "Soporte", quantity: "2", weightGrams: "50",
    printHours: "2", printHoursBasis: "per-piece",
  }];
  state.printing.wastePercent = "10";
  state.printing.electricityCostPerBox = "50";
  state.supplies = [{ name: "Pegamento", quantity: "2", unitPrice: "5" }];
  state.labor = [{ name: "Armado", hours: "2", hourlyRate: "100" }];
  state.packaging = [{ name: "Caja", quantity: "1", unitPrice: "40" }];
  state.adjustments = { wastePercent: "10", warrantyPercent: "10" };
  state.pricing = { mode: "margin", targetMarginPercent: "50", manualPrice: "", targetMarkupPercent: "" };
  return state;
}

test("calcula cantidades, impresión por pieza, mermas, garantía y margen sin duplicar rubros", () => {
  const result = sandbox.testApi.calculateFinancialSummary(sampleState());

  assert.equal(result.hardwareTotal, 300);
  assert.equal(result.printingTotalGrams, 100);
  assert.equal(result.printingTotalHours, 4);
  assert.equal(result.printingBaseCost, 1000);
  assert.equal(result.printingWasteCost, 100);
  assert.equal(result.printingElectricityCostPerBox, 50);
  assert.equal(result.printingTotal, 1150);
  assert.equal(result.suppliesTotal, 10);
  assert.equal(result.laborTotal, 200);
  assert.equal(result.packagingTotal, 40);
  assert.equal(result.directBaseCost, 1700);
  assert.equal(result.wasteBase, 350);
  assert.equal(result.wasteCost, 35);
  assert.equal(result.warrantyBase, 1735);
  assert.equal(result.warrantyReserve, 173.5);
  assert.equal(result.variableUnitCost, 1908.5);
  assert.equal(result.salePrice, 3817);
  assert.equal(result.contributionPerUnit, 1908.5);
  assert.equal(result.marginPercent, 50);
});

test("mantiene las horas viejas como horas del lote y recalcula las cantidades", () => {
  const state = sampleState();
  state.printing.pieces[0].printHoursBasis = "batch";
  assert.equal(sandbox.testApi.calculateFinancialSummary(state).printingTotalHours, 2);

  state.printing.pieces[0].quantity = "3";
  const updated = sandbox.testApi.calculateFinancialSummary(state);
  assert.equal(updated.printingTotalGrams, 150);
  assert.equal(updated.printingTotalHours, 2);
  assert.equal(updated.printingBaseCost, 1500);
});

test("los costos mensuales siguen separados del costo unitario y convierten con la tasa manual", () => {
  const state = sampleState();
  state.currencySettings = { displayCurrency: "ARS", usdArsRate: "1000", rateUpdatedAt: "2026-10-23" };
  state.monthlyCosts = [
    { concept: "Cloudflare", amount: "17230", currency: "ARS", periodicity: "monthly" },
    { concept: "Railway", amount: "39.83", currency: "USD", periodicity: "monthly" },
  ];
  const result = sandbox.testApi.calculateFinancialSummary(state);

  assert.equal(result.monthlyFixedCosts, 57060);
  assert.equal(result.variableUnitCost, 1908.5);
  assert.equal(result.marginPercent, 50);
});

test("agrupa hardware sin alterar nombres, cantidades, precios ni costo global", () => {
  const state = sampleState();
  state.components = [
    { id: "mq", name: "sensor mq135", quantity: "1", unitPrice: "5500", supplier: "A" },
    { id: "jack", name: "ficha jack", quantity: "4", unitPrice: "1144.6", supplier: "B" },
    { id: "pump", name: "Mini Bomba Para Riego Agua R385 14150 12v", quantity: "1", unitPrice: "10341", supplier: "C" },
    { id: "capacitor", name: "capacitor ceramico", quantity: "4", unitPrice: "400", supplier: "D" },
    { id: "stepdown", name: "step down", quantity: "2", unitPrice: "4700", supplier: "E" },
    { id: "resistor", name: "resistencia 100 ohm", quantity: "10", unitPrice: "327", supplier: "F" },
    { id: "led", name: "foco 5mm", quantity: "10", unitPrice: "131.9", supplier: "G" },
    { id: "esp", name: "esp 32 supermini c3", quantity: "4", unitPrice: "7000", supplier: "H" },
    { id: "soil", name: "sensor humedad de suelo", quantity: "4", unitPrice: "3867", supplier: "I" },
    { id: "relay", name: "modulo rele 4 canales", quantity: "1", unitPrice: "7189", supplier: "J" },
    { id: "pi", name: "Raspberry Pi 3 B+", quantity: "1", unitPrice: "120329", supplier: "K" },
    { id: "dht", name: "sensor dth 22", quantity: "1", unitPrice: "11052", supplier: "L" },
    { id: "power", name: "transformador 5v 2a", quantity: "4", unitPrice: "8000", supplier: "M" },
  ];
  const before = state.components.map(({ id, name, quantity, unitPrice, supplier }) => ({ id, name, quantity, unitPrice, supplier }));
  const normalized = sandbox.testApi.normalizeImportedState(state);
  const result = sandbox.testApi.calculateFinancialSummary(normalized);
  const groups = new Map(result.hardwareGroups.map((group) => [group.id, group]));

  assert.deepEqual(
    normalized.components.map(({ id, name, quantity, unitPrice, supplier }) => ({ id, name, quantity, unitPrice, supplier })),
    before,
  );
  assert.equal(result.hardwareTotal, 250046.4);
  assert.equal(groups.get("relay").total, 7189);
  assert.equal(groups.get("environment").total, 16552);
  assert.equal(groups.get("soil").total, 15468);
  assert.equal(groups.get("irrigation").total, 10341);
  assert.equal(groups.get("shared").total, 120329);
  assert.equal(groups.get("unassigned").total, 80167.4);
  assert.equal(result.hardwareGroups.reduce((sum, group) => sum + group.total, 0), result.hardwareTotal);
  assert.equal(result.hardwareGroups.reduce((sum, group) => sum + group.componentCount, 0), 13);
});

test("mantiene el hardware pendiente en el total y actualiza el nodo al corregir cantidad o precio", () => {
  const state = sampleState();
  state.components = [{ id: "generic", name: "step down", quantity: "2", unitPrice: "4700" }];
  let result = sandbox.testApi.calculateFinancialSummary(state);
  assert.equal(result.hardwareTotal, 9400);
  assert.equal(result.hardwareGroups.find((group) => group.id === "unassigned").total, 9400);

  state.components[0].hardwareNode = "environment";
  state.components[0].quantity = "3";
  state.components[0].unitPrice = "5000";
  result = sandbox.testApi.calculateFinancialSummary(state);
  assert.equal(result.hardwareTotal, 15000);
  assert.equal(result.hardwareGroups.find((group) => group.id === "environment").total, 15000);
  assert.equal(result.hardwareGroups.find((group) => group.id === "unassigned").total, 0);
});

test("la consolidación local y compartida conserva la asignación explícita del nodo", () => {
  const cloud = sandbox.testApi.createDefaultState();
  cloud.components = [{ id: "part", name: "step down", quantity: "2", unitPrice: "4700" }];
  const local = sandbox.testApi.createDefaultState();
  local.components = [{ id: "part", name: "step down", quantity: "2", unitPrice: "4700", hardwareNode: "environment" }];

  const merged = sandbox.testApi.mergeStatesWithoutDataLoss(cloud, local);
  assert.equal(merged.state.components.length, 1);
  assert.equal(merged.state.components[0].hardwareNode, "environment");
  assert.equal(sandbox.testApi.calculateFinancialSummary(merged.state).hardwareTotal, 9400);
});
