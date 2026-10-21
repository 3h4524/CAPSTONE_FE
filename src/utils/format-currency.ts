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

/**
 * Formats a raw monetary amount (already in full VND) into Vietnamese Dong (VND / ₫).
 * Example: 250000 -> "250.000 ₫"
 */
export function formatRawVnd(amountVnd: number): string {
  if (isNaN(amountVnd) || amountVnd === null || amountVnd === undefined) {
    return "0 ₫";
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amountVnd);
}

/**
 * Formats an amount stored in thousands of VND (1 đơn vị = 1.000 ₫) into Vietnamese Dong (VND / ₫).
 * Quy ước: Số lưu trong hệ thống là "nghìn đồng" (x 1.000)
 * Example:
 * 50 -> "50.000 ₫"
 * 250 -> "250.000 ₫"
 * 9.99 -> "9.990 ₫"
 */
export function formatCurrencyVnd(amountInThousands: number): string {
  if (isNaN(amountInThousands) || amountInThousands === null || amountInThousands === undefined) {
    return "0 ₫";
  }
  const realVnd = Math.round(amountInThousands * 1_000);
  return formatRawVnd(realVnd);
}

/**
 * Formats a compact VND string for charts or space-constrained labels.
 * Số đầu vào là "nghìn đồng" (x 1.000).
 * Example:
 * 1500000 -> "1.5 tỷ ₫" (1.500.000k = 1.5 tỷ)
 * 25000 -> "25M ₫" (25.000k = 25 triệu)
 * 250 -> "250k ₫" (250k = 250.000 ₫)
 * 50 -> "50k ₫"
 */
export function formatCompactVnd(valueInThousands: number): string {
  if (isNaN(valueInThousands) || valueInThousands === null || valueInThousands === undefined || valueInThousands === 0) {
    return "0 ₫";
  }
  const realVnd = valueInThousands * 1_000;
  const abs = Math.abs(realVnd);
  const sign = realVnd < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${sign}${(abs / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} tỷ ₫`;
  }
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1).replace(/\.0$/, "")}M ₫`;
  }
  if (abs >= 1_000) {
    return `${sign}${(abs / 1_000).toFixed(0)}k ₫`;
  }
  return `${sign}${abs} ₫`;
}
