import { Injectable, NotFoundException } from '@nestjs/common';
import { computeDashboard, tradeCostUsd } from '../dashboard/calc';
import { parseDateOnly, toDateOnly } from '../fx';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertTradeDto } from './dto/upsert-trade.dto';

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.trade.findMany({
      where: { userId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(serializeTrade);
  }

  async create(userId: string, dto: UpsertTradeDto) {
    const cashWarning = await this.willExceedCash(userId, dto);
    const row = await this.prisma.trade.create({
      data: this.toData(userId, dto),
    });
    return { ...serializeTrade(row), cashWarning };
  }

  async update(userId: string, id: string, dto: UpsertTradeDto) {
    await this.ensureOwned(userId, id);
    const row = await this.prisma.trade.update({
      where: { id },
      data: this.toData(userId, dto),
    });
    return serializeTrade(row);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.trade.delete({ where: { id } });
    return { ok: true };
  }

  private toData(userId: string, dto: UpsertTradeDto) {
    return {
      userId,
      date: parseDateOnly(dto.date),
      ticker: dto.ticker.trim().toUpperCase(),
      side: dto.side,
      shares: dto.shares,
      priceUsd: dto.priceUsd,
      feeUsd: dto.feeUsd ?? 0,
      note: dto.note?.trim() ?? '',
    };
  }

  private async willExceedCash(userId: string, dto: UpsertTradeDto) {
    if (dto.side !== 'buy') return false;
    const [transfers, trades] = await Promise.all([
      this.prisma.fxTransfer.findMany({ where: { userId } }),
      this.prisma.trade.findMany({ where: { userId } }),
    ]);
    const summary = computeDashboard(transfers, trades);
    const cost = tradeCostUsd({
      date: parseDateOnly(dto.date),
      createdAt: new Date(),
      ticker: dto.ticker,
      side: dto.side,
      shares: dto.shares,
      priceUsd: dto.priceUsd,
      feeUsd: dto.feeUsd ?? 0,
    });
    return cost > summary.cashUsd + 1e-8;
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
  date: Date;
  ticker: string;
  side: string;
  shares: number;
  priceUsd: number;
  feeUsd: number;
  note: string;
}) {
  return {
    id: row.id,
    date: toDateOnly(row.date),
    ticker: row.ticker,
    side: row.side,
    shares: row.shares,
    priceUsd: row.priceUsd,
    feeUsd: row.feeUsd,
    note: row.note,
    totalUsd: tradeCostUsd({
      date: row.date,
      createdAt: row.date,
      ticker: row.ticker,
      side: row.side,
      shares: row.shares,
      priceUsd: row.priceUsd,
      feeUsd: row.feeUsd,
    }),
  };
}
