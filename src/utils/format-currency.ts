export function formatCurrency(amount: number, currency: "VND" | "USD" = "VND"): string {
  if (currency === "VND") {
    return `₫ ${new Intl.NumberFormat("en-US").format(Math.round(amount))}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactNumber(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(amount);
}
