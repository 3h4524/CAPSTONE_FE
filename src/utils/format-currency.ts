/**
 * Formats a monetary amount into VND or USD.
 * Quy ước: Số lưu trong hệ thống là "nghìn đồng" (x 1.000) đối với VND.
 * Không làm tròn để đảm bảo hiển thị chính xác toàn bộ giá trị.
 */
export function formatCurrency(amount: number, currency: "VND" | "USD" = "VND"): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return currency === "VND" ? "0 ₫" : "$0.00";
  }

  if (currency === "VND") {
    const realVnd = amount * 1_000;
    return formatRawVnd(realVnd);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompactNumber(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return "0";
  }
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
  }).format(amount);
}

/**
 * Formats a raw monetary amount (already in full VND) into Vietnamese Dong (VND / ₫).
 * Example: 250000 -> "250.000 ₫"
 * Không làm tròn cứng, giữ số thập phân nếu có (tối đa 2 chữ số).
 */
export function formatRawVnd(amountVnd: number): string {
  if (isNaN(amountVnd) || amountVnd === null || amountVnd === undefined) {
    return "0 ₫";
  }
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 2,
  }).format(amountVnd);
}

/**
 * Formats an amount stored in thousands of VND (1 đơn vị = 1.000 ₫) into Vietnamese Dong (VND / ₫).
 * Quy ước: Số lưu trong hệ thống là "nghìn đồng" (x 1.000)
 * Example:
 * 50 -> "50.000 ₫"
 * 250 -> "250.000 ₫"
 * 9.99 -> "9.990 ₫"
 * Không làm tròn (không dùng Math.round).
 */
export function formatCurrencyVnd(amountInThousands: number): string {
  if (isNaN(amountInThousands) || amountInThousands === null || amountInThousands === undefined) {
    return "0 ₫";
  }
  const realVnd = amountInThousands * 1_000;
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
