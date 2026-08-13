import { BadRequestException } from '@nestjs/common';

export function resolveFxAmounts(input: {
  thbAmount?: number;
  usdAmount?: number;
  rate?: number;
}): { thbAmount: number; usdAmount: number; rate: number } {
  const thb = input.thbAmount;
  const usd = input.usdAmount;
  const rate = input.rate;
  const present = [thb, usd, rate].filter(
    (value) => value !== undefined && value !== null && Number(value) > 0,
  );

  if (present.length < 2) {
    throw new BadRequestException(
      'กรอกอย่างน้อย 2 ใน 3: จำนวนบาท, จำนวนดอลลาร์, หรือเรท',
    );
  }

  if (thb && usd && rate) {
    return { thbAmount: thb, usdAmount: usd, rate };
  }
  if (thb && rate) {
    return { thbAmount: thb, usdAmount: thb / rate, rate };
  }
  if (thb && usd) {
    return { thbAmount: thb, usdAmount: usd, rate: thb / usd };
  }
  if (usd && rate) {
    return { thbAmount: usd * rate, usdAmount: usd, rate };
  }

  throw new BadRequestException(
    'กรอกอย่างน้อย 2 ใน 3: จำนวนบาท, จำนวนดอลลาร์, หรือเรท',
  );
}

export function parseDateOnly(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new BadRequestException('วันที่ต้องเป็นรูปแบบ YYYY-MM-DD');
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}
