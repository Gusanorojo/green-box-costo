const assert = require("node:assert/strict");
const test = require("node:test");

const currency = require("../currency");
const { normalizeState } = require("../server");

test("normaliza registros viejos a ARS y conserva monedas válidas", () => {
  const normalized = normalizeState({
    version: 2,
    monthlyCosts: [
      { id: "old", concept: "Cloudflare", amount: "17230", periodicity: "monthly" },
      { id: "new", concept: "Railway", amount: "39.83", currency: "USD", periodicity: "monthly" },
    ],
  });

  assert.equal(normalized.version, 7);
  assert.equal(normalized.printing.electricityCostPerBox, "");
  assert.equal(normalized.currencySettings.displayCurrency, "ARS");
  assert.deepEqual(
    normalized.monthlyCosts.map(({ id, amount, currency: code }) => ({ id, amount, currency: code })),
    [
      { id: "old", amount: "17230", currency: "ARS" },
      { id: "new", amount: "39.83", currency: "USD" },
    ],
  );
});

test("migra la lista de compras sin alterar registros anteriores y conserva los nuevos", () => {
  const normalized = normalizeState({
    version: 3,
    components: [{ id: "existing", name: "Caja", quantity: "1", unitPrice: "1200" }],
    purchaseItems: [
      {
        id: "purchase-1",
        componentId: "component-1",
        name: "Filamento PLA",
        quantity: "2.5",
        unit: "kg",
        unitPrice: "12.40",
        currency: "USD",
        supplier: "Proveedor demo",
      },
      {
        id: "purchase-2",
        sourceType: "supplies",
        sourceId: "supply-1",
        sourceCategory: "Insumos",
        name: "Pegamento",
        quantity: "3",
        unit: "unidad",
        unitPrice: "500.50",
      },
    ],
  });

  assert.equal(normalized.version, 7);
  assert.equal(normalized.components[0].name, "Caja");
  assert.deepEqual(normalized.purchaseItems, [
    {
      id: "purchase-1",
      componentId: "component-1",
      sourceType: "hardware",
      sourceId: "component-1",
      sourceCategory: "",
      name: "Filamento PLA",
      quantity: "2.5",
      unit: "kg",
      unitPrice: "12.40",
      currency: "USD",
      supplier: "Proveedor demo",
    },
    {
      id: "purchase-2",
      componentId: "",
      sourceType: "supplies",
      sourceId: "supply-1",
      sourceCategory: "Insumos",
      name: "Pegamento",
      quantity: "3",
      unit: "unidad",
      unitPrice: "500.50",
      currency: "ARS",
      supplier: "",
    },
  ]);
});

test("migra el costo de electricidad por box y conserva un valor ya cargado", () => {
  const normalized = normalizeState({
    version: 5,
    printing: {
      electricityCostPerBox: "123.45",
    },
  });

  assert.equal(normalized.version, 7);
  assert.equal(normalized.printing.electricityCostPerBox, "123.45");
});

test("agrega un inventario vacío a datos anteriores y conserva el stock cargado", () => {
  const legacy = normalizeState({
    version: 6,
    components: [{ id: "part-1", name: "Tornillo", quantity: "4", unitPrice: "100" }],
  });
  const withStock = normalizeState({
    version: 7,
    components: [{ id: "part-1", name: "Tornillo", quantity: "4", unitPrice: "100" }],
    inventory: [{
      id: "stock-1",
      sourceType: "hardware",
      sourceId: "part-1",
      sourceCategory: "Hardware",
      name: "Tornillo",
      quantity: "25.5",
      unit: "unidad",
    }],
  });

  assert.equal(legacy.version, 7);
  assert.deepEqual(legacy.inventory, []);
  assert.equal(legacy.components[0].name, "Tornillo");
  assert.deepEqual(withStock.inventory, [{
    id: "stock-1",
    sourceType: "hardware",
    sourceId: "part-1",
    sourceCategory: "Hardware",
    name: "Tornillo",
    quantity: "25.5",
    unit: "unidad",
  }]);
});

test("convierte Cloudflare y Railway y suma ambos importes en la moneda elegida", () => {
  const costs = [
    { concept: "Cloudflare", amount: "17230", currency: "ARS", periodicity: "monthly" },
    { concept: "Railway", amount: "39.83", currency: "USD", periodicity: "monthly" },
  ];

  // Cotización de prueba solamente; la app no la guarda ni la propone como cotización real.
  const testRate = "1000";
  assert.equal(currency.monthlyEquivalentMinorUnits(costs[0], "ARS", testRate), 1_723_000n);
  assert.equal(currency.monthlyEquivalentMinorUnits(costs[1], "ARS", testRate), 3_983_000n);
  assert.equal(currency.sumMonthlyCostsMinorUnits(costs, "ARS", testRate), 5_706_000n);

  assert.equal(currency.monthlyEquivalentMinorUnits(costs[0], "USD", testRate), 1_723n);
  assert.equal(currency.monthlyEquivalentMinorUnits(costs[1], "USD", testRate), 3_983n);
  assert.equal(currency.sumMonthlyCostsMinorUnits(costs, "USD", testRate), 5_706n);
});

test("mantiene la periodicidad anual y calcula equivalentes mensuales", () => {
  const annualCost = {
    amount: "1200",
    currency: "ARS",
    periodicity: "annual",
  };

  assert.equal(currency.monthlyEquivalentMinorUnits(annualCost, "ARS"), 10_000n);
  assert.equal(
    currency.monthlyEquivalentMinorUnits(
      { ...annualCost, currency: "USD" },
      "ARS",
      "1000",
    ),
    10_000_000n,
  );
});

test("suma centavos sin errores binarios y redondea conversiones a dos decimales", () => {
  const smallCosts = [
    { amount: "0.10", currency: "ARS", periodicity: "monthly" },
    { amount: "0.20", currency: "ARS", periodicity: "monthly" },
  ];
  const halfCentConversion = {
    amount: "0.01",
    currency: "USD",
    periodicity: "monthly",
  };

  assert.equal(currency.sumMonthlyCostsMinorUnits(smallCosts, "ARS"), 30n);
  assert.equal(currency.monthlyEquivalentMinorUnits(halfCentConversion, "ARS", "0.5"), 1n);
});

test("no convierte ni suma importes mixtos si falta el tipo de cambio", () => {
  const mixedCosts = [
    { amount: "17230", currency: "ARS", periodicity: "monthly" },
    { amount: "39.83", currency: "USD", periodicity: "monthly" },
  ];

  assert.equal(currency.monthlyEquivalentMinorUnits(mixedCosts[1], "ARS"), null);
  assert.equal(currency.sumMonthlyCostsMinorUnits(mixedCosts, "ARS"), null);
  assert.equal(currency.sumMonthlyCostsMinorUnits(mixedCosts, "USD"), null);
});

test("calcula subtotales y totales de compras con cantidades decimales y monedas mixtas", () => {
  const purchases = [
    { quantity: "2.5", unitPrice: "12.40", currency: "USD" },
    { quantity: "1", unitPrice: "10", currency: "ARS" },
  ];

  assert.equal(currency.purchaseItemOriginalTotalMinorUnits(purchases[0]), 3_100n);
  assert.equal(currency.purchaseItemTotalMinorUnits(purchases[0], "ARS", "1000"), 3_100_000n);
  assert.equal(currency.sumPurchaseItemsMinorUnits(purchases, "ARS", "1000"), 3_101_000n);
  assert.equal(currency.sumPurchaseItemsMinorUnits(purchases, "USD", "1000"), 3_101n);
  assert.equal(currency.sumPurchaseItemsMinorUnits(purchases, "ARS"), null);
});
