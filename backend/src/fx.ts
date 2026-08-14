import { BadRequestException } from '@nestjs/common';

export function roundMoney(value: number, digits = 2): number {
  if (!Number.isFinite(value)) return 0;
  const factor = 10 ** digits;
  const rounded = Math.round((value + Number.EPSILON) * factor) / factor;
  return rounded === 0 ? 0 : rounded;
}

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
    return {
      thbAmount: roundMoney(thb),
      usdAmount: roundMoney(usd),
      rate: roundMoney(rate),
    };
  }
  if (thb && rate) {
    return {
      thbAmount: roundMoney(thb),
      usdAmount: roundMoney(thb / rate),
      rate: roundMoney(rate),
    };
  }
  if (thb && usd) {
    return {
      thbAmount: roundMoney(thb),
      usdAmount: roundMoney(usd),
      rate: roundMoney(thb / usd),
    };
  }
  if (usd && rate) {
    return {
      thbAmount: roundMoney(usd * rate),
      usdAmount: roundMoney(usd),
      rate: roundMoney(rate),
    };
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
