export const usdToVnd = (usd: number, rate: number): number => Math.round(usd * rate);

export const vndToUsd = (vnd: number, rate: number): number => Math.round((vnd / rate) * 100) / 100;
