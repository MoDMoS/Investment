import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { parseDateOnly, toDateOnly } from '../fx';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertDividendDto } from './dto/upsert-dividend.dto';

@Injectable()
export class DividendsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const rows = await this.prisma.dividend.findMany({
      where: { userId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(serializeDividend);
  }

  async create(userId: string, dto: UpsertDividendDto) {
    const row = await this.prisma.dividend.create({
      data: this.toData(userId, dto),
    });
    return serializeDividend(row);
  }

  async update(userId: string, id: string, dto: UpsertDividendDto) {
    await this.ensureOwned(userId, id);
    const row = await this.prisma.dividend.update({
      where: { id },
      data: this.toData(userId, dto),
    });
    return serializeDividend(row);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.dividend.delete({ where: { id } });
    return { ok: true };
  }

  private toData(userId: string, dto: UpsertDividendDto) {
    const taxUsd = dto.taxUsd ?? 0;
    const netUsd = dto.grossUsd - taxUsd;
    if (netUsd < -1e-8) {
      throw new BadRequestException('ภาษีต้องไม่เกินยอดปันผลก่อนหักภาษี');
    }
    return {
      userId,
      date: parseDateOnly(dto.date),
      ticker: dto.ticker.trim().toUpperCase(),
      shares: dto.shares ?? 0,
      grossUsd: dto.grossUsd,
      taxUsd,
      netUsd: Math.max(netUsd, 0),
      note: dto.note?.trim() ?? '',
    };
  }

  private async ensureOwned(userId: string, id: string) {
    const row = await this.prisma.dividend.findFirst({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException('ไม่พบรายการปันผล');
    }
  }
}

function serializeDividend(row: {
  id: string;
  date: Date;
  ticker: string;
  shares: number;
  grossUsd: number;
  taxUsd: number;
  netUsd: number;
  note: string;
}) {
  return {
    id: row.id,
    date: toDateOnly(row.date),
    ticker: row.ticker,
    shares: row.shares,
    grossUsd: row.grossUsd,
    taxUsd: row.taxUsd,
    netUsd: row.netUsd,
    note: row.note,
  };
}
