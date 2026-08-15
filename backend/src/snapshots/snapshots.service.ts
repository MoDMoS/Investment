import { Injectable } from '@nestjs/common';
import { parseDateOnly, roundMoney, toDateOnly } from '../fx';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuotesService } from '../quotes/quotes.service';

export type SnapshotInput = {
  cashUsd: number;
  cashThb: number;
  marketValueUsd: number | null;
  marketValueThb: number | null;
  holdingsCostUsd: number;
  holdingsCostThb: number;
  thbNetAbroad: number;
};

@Injectable()
export class SnapshotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly quotes: QuotesService,
  ) {}

  async list(userId: string, limit = 365) {
    await this.accounts.ensureDefaults(userId);
    const rows = await this.prisma.portfolioSnapshot.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      take: Math.min(Math.max(limit, 1), 1000),
    });
    return rows.map((row) => ({
      id: row.id,
      date: toDateOnly(row.date),
      cashUsd: row.cashUsd,
      cashThb: row.cashThb,
      marketValueUsd: row.marketValueUsd,
      marketValueThb: row.marketValueThb,
      holdingsCostUsd: row.holdingsCostUsd,
      holdingsCostThb: row.holdingsCostThb,
      thbNetAbroad: row.thbNetAbroad,
      totalUsdApprox: row.totalUsdApprox,
    }));
  }

  async upsertToday(userId: string, summary: SnapshotInput) {
    const today = parseDateOnly(toDateOnly(new Date()));
    let usdThb: number | null = null;
    try {
      const quote = await this.quotes.getUsdThb();
      usdThb = quote.rate ?? null;
    } catch {
      usdThb = null;
    }

    const mvUsd = summary.marketValueUsd ?? summary.holdingsCostUsd;
    const mvThb = summary.marketValueThb ?? summary.holdingsCostThb;
    const thbAsUsd =
      usdThb && usdThb > 0
        ? roundMoney((summary.cashThb + mvThb) / usdThb)
        : null;
    const totalUsdApprox = roundMoney(
      summary.cashUsd + mvUsd + (thbAsUsd ?? 0),
    );

    const data = {
      cashUsd: summary.cashUsd,
      cashThb: summary.cashThb,
      marketValueUsd: summary.marketValueUsd,
      marketValueThb: summary.marketValueThb,
      holdingsCostUsd: summary.holdingsCostUsd,
      holdingsCostThb: summary.holdingsCostThb,
      thbNetAbroad: summary.thbNetAbroad,
      totalUsdApprox,
    };

    const row = await this.prisma.portfolioSnapshot.upsert({
      where: { userId_date: { userId, date: today } },
      create: { userId, date: today, ...data },
      update: data,
    });

    return {
      id: row.id,
      date: toDateOnly(row.date),
      ...data,
    };
  }
}
