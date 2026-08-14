const thb = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const usd = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

const shares = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 4,
});

const rate = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
});

export const fmt = {
  thb: (value: number) => `${thb.format(value)} บาท`,
  usd: (value: number) => `${usd.format(value)} USD`,
  shares: (value: number) => shares.format(value),
  rate: (value: number) => rate.format(value),
  number: (value: number, digits = 4) =>
    new Intl.NumberFormat('th-TH', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value),
  signed: (format: (value: number) => string, value: number) =>
    `${value > 0 ? '+' : ''}${format(value)}`,
};

export function todayIso() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

export function apiError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
