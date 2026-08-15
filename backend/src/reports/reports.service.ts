import { BadRequestException, Injectable } from '@nestjs/common';
import { computePositions, isThaiMarket } from '../dashboard/calc';
import { parseDateOnly, roundMoney, toDateOnly } from '../fx';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async summary(
    userId: string,
    input: { period: 'year' | 'month'; year?: number; month?: number },
  ) {
    await this.accounts.ensureDefaults(userId);
    const now = new Date();
    const year = input.year ?? now.getFullYear();
    const month = input.month ?? now.getMonth() + 1;
    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      throw new BadRequestException('ปีไม่ถูกต้อง');
    }
    if (input.period === 'month' && (!Number.isInteger(month) || month < 1 || month > 12)) {
      throw new BadRequestException('เดือนไม่ถูกต้อง');
    }

    const { start, end, label } =
      input.period === 'month'
        ? monthRange(year, month)
        : yearRange(year);

    const [transfers, trades, dividends] = await Promise.all([
      this.prisma.fxTransfer.findMany({ where: { userId } }),
      this.prisma.trade.findMany({ where: { userId } }),
      this.prisma.dividend.findMany({ where: { userId } }),
    ]);

    const periodTransfers = transfers.filter((row) => inRange(row.date, start, end));
    const periodDividends = dividends.filter((row) => inRange(row.date, start, end));
    const periodTrades = trades.filter((row) => inRange(row.date, start, end));

    let thbOut = 0;
    let thbIn = 0;
    let usdOut = 0;
    let usdIn = 0;
    for (const row of periodTransfers) {
      if (row.direction === 'out') {
        thbOut = roundMoney(thbOut + row.thbAmount);
        usdOut = roundMoney(usdOut + row.usdAmount);
      } else {
        thbIn = roundMoney(thbIn + row.thbAmount);
        usdIn = roundMoney(usdIn + row.usdAmount);
      }
    }

    const foreignDiv = periodDividends.filter((row) => !isThaiMarket(row.market));
    const thaiDiv = periodDividends.filter((row) => isThaiMarket(row.market));

    const { realized } = computePositions(trades);
    const periodRealized = realized.filter((row) => inRange(row.date, start, end));
    const realizedForeign = periodRealized.filter((row) => row.market === 'foreign');
    const realizedThai = periodRealized.filter((row) => row.market === 'th');

    const months =
      input.period === 'year'
        ? buildMonthlyBuckets(year, transfers, dividends, realized)
        : undefined;

    return {
      period: input.period,
      year,
      month: input.period === 'month' ? month : null,
      label,
      start: toDateOnly(start),
      end: toDateOnly(end),
      thbOut,
      thbIn,
      thbNetAbroad: roundMoney(thbOut - thbIn),
      usdOut,
      usdIn,
      avgOutRate: usdOut > 0 ? roundMoney(thbOut / usdOut) : null,
      dividendGrossUsd: roundMoney(foreignDiv.reduce((s, r) => s + r.grossUsd, 0)),
      dividendNetUsd: roundMoney(foreignDiv.reduce((s, r) => s + r.netUsd, 0)),
      dividendGrossThb: roundMoney(thaiDiv.reduce((s, r) => s + r.grossUsd, 0)),
      dividendNetThb: roundMoney(thaiDiv.reduce((s, r) => s + r.netUsd, 0)),
      realizedPnlUsd: roundMoney(realizedForeign.reduce((s, r) => s + r.pnl, 0)),
      realizedPnlThb: roundMoney(realizedThai.reduce((s, r) => s + r.pnl, 0)),
      tradeCount: periodTrades.length,
      transferCount: periodTransfers.length,
      dividendCount: periodDividends.length,
      months,
    };
  }
}

function yearRange(year: number) {
  const start = parseDateOnly(`${year}-01-01`);
  const end = parseDateOnly(`${year}-12-31`);
  return { start, end, label: `ปี ${year}` };
}

function monthRange(year: number, month: number) {
  const mm = String(month).padStart(2, '0');
  const start = parseDateOnly(`${year}-${mm}-01`);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const end = parseDateOnly(`${year}-${mm}-${String(lastDay).padStart(2, '0')}`);
  return { start, end, label: `${mm}/${year}` };
}

function inRange(date: Date, start: Date, end: Date) {
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}

function buildMonthlyBuckets(
  year: number,
  transfers: { date: Date; direction: string; thbAmount: number; usdAmount: number }[],
  dividends: { date: Date; market: string; grossUsd: number; netUsd: number }[],
  realized: { date: Date; market: 'th' | 'foreign'; pnl: number }[],
) {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    const { start, end } = monthRange(year, month);
    const t = transfers.filter((row) => inRange(row.date, start, end));
    const d = dividends.filter((row) => inRange(row.date, start, end));
    const r = realized.filter((row) => inRange(row.date, start, end));
    let thbOut = 0;
    let thbIn = 0;
    for (const row of t) {
      if (row.direction === 'out') thbOut = roundMoney(thbOut + row.thbAmount);
      else thbIn = roundMoney(thbIn + row.thbAmount);
    }
    const foreignDiv = d.filter((row) => !isThaiMarket(row.market));
    const thaiDiv = d.filter((row) => isThaiMarket(row.market));
    return {
      month,
      label: String(month).padStart(2, '0'),
      thbOut,
      thbIn,
      dividendNetUsd: roundMoney(foreignDiv.reduce((s, row) => s + row.netUsd, 0)),
      dividendNetThb: roundMoney(thaiDiv.reduce((s, row) => s + row.netUsd, 0)),
      realizedPnlUsd: roundMoney(
        r.filter((row) => row.market === 'foreign').reduce((s, row) => s + row.pnl, 0),
      ),
      realizedPnlThb: roundMoney(
        r.filter((row) => row.market === 'th').reduce((s, row) => s + row.pnl, 0),
      ),
    };
  });
}
