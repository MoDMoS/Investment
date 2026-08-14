import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { parseDateOnly, toDateOnly } from '../fx';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertDividendDto } from './dto/upsert-dividend.dto';

@Injectable()
export class DividendsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async list(userId: string) {
    await this.accounts.ensureDefaults(userId);
    const rows = await this.prisma.dividend.findMany({
      where: { userId },
      include: { account: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(serializeDividend);
  }

  async create(userId: string, dto: UpsertDividendDto) {
    const account = await this.accounts.resolve(userId, dto.accountId, 'foreign');
    const row = await this.prisma.dividend.create({
      data: this.toData(userId, dto, account.id),
      include: { account: { select: { name: true } } },
    });
    return serializeDividend(row);
  }

  async update(userId: string, id: string, dto: UpsertDividendDto) {
    await this.ensureOwned(userId, id);
    const account = await this.accounts.resolve(userId, dto.accountId, 'foreign');
    const row = await this.prisma.dividend.update({
      where: { id },
      data: this.toData(userId, dto, account.id),
      include: { account: { select: { name: true } } },
    });
    return serializeDividend(row);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.dividend.delete({ where: { id } });
    return { ok: true };
  }

  private toData(userId: string, dto: UpsertDividendDto, accountId: string) {
    const taxUsd = dto.taxUsd ?? 0;
    const netUsd = dto.grossUsd - taxUsd;
    if (netUsd < -1e-8) {
      throw new BadRequestException('ภาษีต้องไม่เกินยอดปันผลก่อนหักภาษี');
    }
    return {
      userId,
      accountId,
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
  accountId: string | null;
  account?: { name: string } | null;
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
    accountId: row.accountId,
    accountName: row.account?.name ?? '',
    date: toDateOnly(row.date),
    ticker: row.ticker,
    shares: row.shares,
    grossUsd: row.grossUsd,
    taxUsd: row.taxUsd,
    netUsd: row.netUsd,
    note: row.note,
  };
}
