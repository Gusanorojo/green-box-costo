(function exposeGreenBoxCurrency(root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.GreenBoxCurrency = api;
})(globalThis, function createGreenBoxCurrency() {
  const CURRENCIES = new Set(["ARS", "USD"]);
  const pow10 = (digits) => 10n ** BigInt(digits);

  function normalizeCurrency(value) {
    return CURRENCIES.has(String(value || "").trim().toUpperCase())
      ? String(value).trim().toUpperCase()
      : "ARS";
  }

  function normalizeCostCurrency(cost) {
    return {
      ...cost,
      currency: normalizeCurrency(cost?.currency),
    };
  }

  function parseDecimal(value) {
    let input = String(value ?? "").trim();

    if (!input || (input.includes(",") && input.includes("."))) {
      return null;
    }

    input = input.replace(",", ".");
    const match = input.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:e([+-]?\d+))?$/i);

    if (!match) {
      return null;
    }

    const whole = match[2] || "0";
    const fraction = match[3] ?? match[4] ?? "";
    const exponent = Number(match[5] || 0);

    if (
      whole.length > 24
      || fraction.length > 18
      || !Number.isInteger(exponent)
      || Math.abs(exponent) > 24
    ) {
      return null;
    }

    let coefficient = BigInt(`${whole}${fraction}` || "0");
    let scale = fraction.length - exponent;

    if (scale < 0) {
      coefficient *= pow10(-scale);
      scale = 0;
    }

    if (scale > 18 || whole.length + Math.max(exponent, 0) > 24) {
      return null;
    }

    return {
      coefficient: match[1] === "-" ? -coefficient : coefficient,
      scale,
    };
  }

  function roundDivide(numerator, denominator) {
    if (denominator <= 0n) {
      return null;
    }

    const sign = numerator < 0n ? -1n : 1n;
    const absolute = numerator < 0n ? -numerator : numerator;
    const quotient = absolute / denominator;
    const remainder = absolute % denominator;
    return sign * (quotient + (remainder * 2n >= denominator ? 1n : 0n));
  }

  function toMinorUnits(amount) {
    const decimal = parseDecimal(amount);
    return decimal ? roundDivide(decimal.coefficient * 100n, pow10(decimal.scale)) : null;
  }

  function multiplyMinorUnitsByDecimal(minorUnits, multiplier) {
    const decimal = parseDecimal(multiplier);

    if (!decimal) {
      return null;
    }

    return roundDivide(BigInt(minorUnits) * decimal.coefficient, pow10(decimal.scale));
  }

  function convertMinorUnits(minorUnits, fromCurrency, toCurrency, usdArsRate) {
    const from = normalizeCurrency(fromCurrency);
    const to = normalizeCurrency(toCurrency);
    const amount = typeof minorUnits === "bigint" ? minorUnits : BigInt(minorUnits);

    if (from === to) {
      return amount;
    }

    const rate = parseDecimal(usdArsRate);

    if (!rate || rate.coefficient <= 0n) {
      return null;
    }

    if (from === "USD" && to === "ARS") {
      return roundDivide(amount * rate.coefficient, pow10(rate.scale));
    }

    if (from === "ARS" && to === "USD") {
      return roundDivide(amount * pow10(rate.scale), rate.coefficient);
    }

    return null;
  }

  function convertAmountToMinorUnits(amount, fromCurrency, toCurrency, usdArsRate) {
    const minorUnits = toMinorUnits(amount);
    return minorUnits === null
      ? null
      : convertMinorUnits(minorUnits, fromCurrency, toCurrency, usdArsRate);
  }

  function monthlyEquivalentMinorUnits(cost, targetCurrency = "ARS", usdArsRate = "") {
    const amountMinorUnits = toMinorUnits(cost?.amount);

    if (amountMinorUnits === null) {
      return null;
    }

    const monthlyAmount = cost?.periodicity === "annual"
      ? roundDivide(amountMinorUnits, 12n)
      : amountMinorUnits;

    if (monthlyAmount === null) {
      return null;
    }

    return convertMinorUnits(
      monthlyAmount,
      normalizeCurrency(cost?.currency),
      targetCurrency,
      usdArsRate,
    );
  }

  function sumMonthlyCostsMinorUnits(costs, targetCurrency = "ARS", usdArsRate = "") {
    let total = 0n;

    for (const cost of Array.isArray(costs) ? costs : []) {
      const equivalent = monthlyEquivalentMinorUnits(cost, targetCurrency, usdArsRate);

      if (equivalent === null) {
        return null;
      }

      total += equivalent;
    }

    return total;
  }

  function purchaseItemOriginalTotalMinorUnits(item) {
    const unitAmountMinorUnits = toMinorUnits(item?.unitPrice);

    return unitAmountMinorUnits === null
      ? null
      : multiplyMinorUnitsByDecimal(unitAmountMinorUnits, item?.quantity);
  }

  function purchaseItemTotalMinorUnits(item, targetCurrency = "ARS", usdArsRate = "") {
    const originalTotalMinorUnits = purchaseItemOriginalTotalMinorUnits(item);

    return originalTotalMinorUnits === null
      ? null
      : convertMinorUnits(
          originalTotalMinorUnits,
          normalizeCurrency(item?.currency),
          targetCurrency,
          usdArsRate,
        );
  }

  function sumPurchaseItemsMinorUnits(items, targetCurrency = "ARS", usdArsRate = "") {
    let total = 0n;

    for (const item of Array.isArray(items) ? items : []) {
      const equivalent = purchaseItemTotalMinorUnits(item, targetCurrency, usdArsRate);

      if (equivalent === null) {
        return null;
      }

      total += equivalent;
    }

    return total;
  }

  function minorUnitsToNumber(minorUnits) {
    return Number(minorUnits) / 100;
  }

  return {
    normalizeCurrency,
    normalizeCostCurrency,
    parseDecimal,
    toMinorUnits,
    multiplyMinorUnitsByDecimal,
    convertMinorUnits,
    convertAmountToMinorUnits,
    monthlyEquivalentMinorUnits,
    sumMonthlyCostsMinorUnits,
    purchaseItemOriginalTotalMinorUnits,
    purchaseItemTotalMinorUnits,
    sumPurchaseItemsMinorUnits,
    minorUnitsToNumber,
  };
});
