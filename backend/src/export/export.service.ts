import { Injectable } from '@nestjs/common';
import { toDateOnly } from '../fx';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async get(userId: string) {
    await this.accounts.ensureDefaults(userId);
    const [accounts, transfers, trades, dividends, cashEntries] =
      await Promise.all([
        this.prisma.account.findMany({
          where: { userId },
          orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.fxTransfer.findMany({
          where: { userId },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.trade.findMany({
          where: { userId },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.dividend.findMany({
          where: { userId },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.cashEntry.findMany({
          where: { userId },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      accounts: accounts.map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
      })),
      transfers: transfers.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        date: toDateOnly(row.date),
        direction: row.direction,
        thbAmount: row.thbAmount,
        usdAmount: row.usdAmount,
        rate: row.rate,
        feeThb: row.feeThb,
        feeUsd: row.feeUsd,
        note: row.note,
      })),
      trades: trades.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        date: toDateOnly(row.date),
        ticker: row.ticker,
        market: row.market,
        side: row.side,
        shares: row.shares,
        priceUsd: row.priceUsd,
        feeUsd: row.feeUsd,
        note: row.note,
      })),
      dividends: dividends.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        date: toDateOnly(row.date),
        ticker: row.ticker,
        market: row.market,
        shares: row.shares,
        grossUsd: row.grossUsd,
        taxUsd: row.taxUsd,
        netUsd: row.netUsd,
        note: row.note,
      })),
      cashEntries: cashEntries.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        date: toDateOnly(row.date),
        direction: row.direction,
        amount: row.amount,
        note: row.note,
      })),
    };
  }
}
