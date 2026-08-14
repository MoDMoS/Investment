import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { computeDashboard, tradeCost, tradeCostUsd } from '../dashboard/calc';
import { parseDateOnly, toDateOnly } from '../fx';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertTradeDto } from './dto/upsert-trade.dto';

@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async list(userId: string) {
    await this.accounts.ensureDefaults(userId);
    const rows = await this.prisma.trade.findMany({
      where: { userId },
      include: { account: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(serializeTrade);
  }

  async create(userId: string, dto: UpsertTradeDto) {
    const market = dto.market === 'th' ? 'th' : 'foreign';
    const account = await this.accounts.resolve(userId, dto.accountId, market);
    const cashWarning = await this.willExceedCash(userId, dto, account.id);
    const row = await this.prisma.trade.create({
      data: this.toData(userId, dto, account.id),
      include: { account: { select: { name: true } } },
    });
    return { ...serializeTrade(row), cashWarning };
  }

  async update(userId: string, id: string, dto: UpsertTradeDto) {
    await this.ensureOwned(userId, id);
    const market = dto.market === 'th' ? 'th' : 'foreign';
    const account = await this.accounts.resolve(userId, dto.accountId, market);
    const row = await this.prisma.trade.update({
      where: { id },
      data: this.toData(userId, dto, account.id),
      include: { account: { select: { name: true } } },
    });
    return serializeTrade(row);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.trade.delete({ where: { id } });
    return { ok: true };
  }

  private toData(userId: string, dto: UpsertTradeDto, accountId: string) {
    return {
      userId,
      accountId,
      date: parseDateOnly(dto.date),
      ticker: dto.ticker.trim().toUpperCase(),
      market: dto.market === 'th' ? 'th' : 'foreign',
      side: dto.side,
      shares: dto.shares,
      priceUsd: dto.priceUsd,
      feeUsd: dto.feeUsd ?? 0,
      note: dto.note?.trim() ?? '',
    };
  }

  private async willExceedCash(
    userId: string,
    dto: UpsertTradeDto,
    accountId: string,
  ) {
    if (dto.side !== 'buy') return false;
    const market = dto.market === 'th' ? 'th' : 'foreign';
    if (market === 'th') return false;
    const [transfers, trades, dividends, cashRows] = await Promise.all([
      this.prisma.fxTransfer.findMany({ where: { userId, accountId } }),
      this.prisma.trade.findMany({ where: { userId, accountId } }),
      this.prisma.dividend.findMany({ where: { userId, accountId } }),
      this.prisma.cashEntry.findMany({
        where: { userId, accountId },
        include: { account: { select: { kind: true } } },
      }),
    ]);
    const summary = computeDashboard(
      transfers,
      trades,
      dividends,
      cashRows.map((row) => ({
        accountId: row.accountId,
        direction: row.direction,
        amount: row.amount,
        kind: row.account.kind === 'th' ? 'th' : 'foreign',
      })),
    );
    const tradeRow = {
      date: parseDateOnly(dto.date),
      createdAt: new Date(),
      ticker: dto.ticker,
      market,
      side: dto.side,
      shares: dto.shares,
      priceUsd: dto.priceUsd,
      feeUsd: dto.feeUsd ?? 0,
    };
    return tradeCostUsd(tradeRow) > summary.cashUsd + 1e-8;
  }

  private async ensureOwned(userId: string, id: string) {
    const row = await this.prisma.trade.findFirst({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException('ไม่พบรายการซื้อขาย');
    }
  }
}

function serializeTrade(row: {
  id: string;
  accountId: string | null;
  account?: { name: string } | null;
  date: Date;
  ticker: string;
  market: string;
  side: string;
  shares: number;
  priceUsd: number;
  feeUsd: number;
  note: string;
}) {
  const market = row.market === 'th' ? 'th' : 'foreign';
  return {
    id: row.id,
    accountId: row.accountId,
    accountName: row.account?.name ?? '',
    date: toDateOnly(row.date),
    ticker: row.ticker,
    market,
    side: row.side,
    shares: row.shares,
    priceUsd: row.priceUsd,
    feeUsd: row.feeUsd,
    note: row.note,
    totalUsd: tradeCost({
      date: row.date,
      createdAt: row.date,
      ticker: row.ticker,
      market,
      side: row.side,
      shares: row.shares,
      priceUsd: row.priceUsd,
      feeUsd: row.feeUsd,
    }),
  };
}
