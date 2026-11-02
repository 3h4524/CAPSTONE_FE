/**
 * Formats an amount already in full VND to whole đồng, e.g. 249750 -> "249.750 ₫". Prices are
 * stored in USD; the API sends every amount the UI shows in full VND, at the PayOS rate.
 */
export function formatVnd(amountVnd: number | null | undefined): string {
  if (amountVnd === null || amountVnd === undefined || isNaN(amountVnd)) {
    return "0 ₫";
  }
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(
    Math.round(amountVnd)
  );
}

/**
 * Formats an amount already in full VND compactly for axes and tight labels, with English unit
 * suffixes: 2118811000 -> "2.1B ₫", 176567583 -> "176.6M ₫", 249750 -> "250K ₫".
 */
export function formatCompactVndAmount(amountVnd: number | null | undefined): string {
  if (amountVnd === null || amountVnd === undefined || isNaN(amountVnd) || amountVnd === 0) {
    return "0 ₫";
  }
  const abs = Math.abs(amountVnd);
  const sign = amountVnd < 0 ? "-" : "";
  const scaled = (divisor: number, unit: string) => `${sign}${(abs / divisor).toFixed(1).replace(/\.0$/, "")}${unit} ₫`;

  // Each unit takes over where the smaller one would round up to 1000 (999,500 is "1M", not "1000K").
  if (abs >= 999_950_000) return scaled(1_000_000_000, "B");
  if (abs >= 999_500) return scaled(1_000_000, "M");
  if (abs >= 999.5) return `${sign}${Math.round(abs / 1_000)}K ₫`;
  return `${sign}${Math.round(abs)} ₫`;
}
