import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { parseDateOnly, roundMoney, toDateOnly } from '../fx';
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
      include: { account: { select: { name: true, kind: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(serializeDividend);
  }

  async create(userId: string, dto: UpsertDividendDto) {
    const market = dto.market === 'th' ? 'th' : 'foreign';
    const account = await this.accounts.resolve(userId, dto.accountId, market);
    const row = await this.prisma.dividend.create({
      data: this.toData(userId, dto, account.id, market),
      include: { account: { select: { name: true, kind: true } } },
    });
    return serializeDividend(row);
  }

  async update(userId: string, id: string, dto: UpsertDividendDto) {
    await this.ensureOwned(userId, id);
    const market = dto.market === 'th' ? 'th' : 'foreign';
    const account = await this.accounts.resolve(userId, dto.accountId, market);
    const row = await this.prisma.dividend.update({
      where: { id },
      data: this.toData(userId, dto, account.id, market),
      include: { account: { select: { name: true, kind: true } } },
    });
    return serializeDividend(row);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.dividend.delete({ where: { id } });
    return { ok: true };
  }

  private toData(
    userId: string,
    dto: UpsertDividendDto,
    accountId: string,
    market: 'th' | 'foreign',
  ) {
    const taxUsd = roundMoney(dto.taxUsd ?? 0);
    const grossUsd = roundMoney(dto.grossUsd);
    const netUsd = roundMoney(grossUsd - taxUsd);
    if (netUsd < -1e-8) {
      throw new BadRequestException('ภาษีต้องไม่เกินยอดปันผลก่อนหักภาษี');
    }
    return {
      userId,
      accountId,
      date: parseDateOnly(dto.date),
      ticker: dto.ticker.trim().toUpperCase(),
      market,
      shares: dto.shares ?? 0,
      grossUsd,
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
  account?: { name: string; kind?: string } | null;
  date: Date;
  ticker: string;
  market?: string;
  shares: number;
  grossUsd: number;
  taxUsd: number;
  netUsd: number;
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
    shares: row.shares,
    grossUsd: row.grossUsd,
    taxUsd: row.taxUsd,
    netUsd: row.netUsd,
    note: row.note,
  };
}
