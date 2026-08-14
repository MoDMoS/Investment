import { Injectable } from '@nestjs/common';
import { applyQuotes, computeDashboard, quotedTotals } from './calc';
import { toDateOnly } from '../fx';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuotesService } from '../quotes/quotes.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: QuotesService,
    private readonly accounts: AccountsService,
  ) {}

  async get(userId: string, accountId?: string) {
    const accountList = await this.accounts.ensureDefaults(userId);
    if (accountId) {
      await this.accounts.resolve(
        userId,
        accountId,
        accountList.find((row) => row.id === accountId)?.kind === 'th'
          ? 'th'
          : 'foreign',
      );
    }
    const where = { userId, ...(accountId ? { accountId } : {}) };
    const [transfers, trades, dividends, cashRows] = await Promise.all([
      this.prisma.fxTransfer.findMany({ where }),
      this.prisma.trade.findMany({ where }),
      this.prisma.dividend.findMany({ where }),
      this.prisma.cashEntry.findMany({
        where,
        include: { account: { select: { kind: true } } },
      }),
    ]);
    const cashEntries = cashRows.map((row) => ({
      accountId: row.accountId,
      direction: row.direction,
      amount: row.amount,
      kind: (row.account.kind === 'th' ? 'th' : 'foreign') as 'th' | 'foreign',
    }));
    const accounts = accountId
      ? accountList.filter((row) => row.id === accountId)
      : accountList;
    const summary = computeDashboard(
      transfers,
      trades,
      dividends,
      cashEntries,
      accounts,
    );
    const holdings = [...summary.holdingsThai, ...summary.holdingsForeign];
    const realized = summary.realized.map((row) => ({
      ...row,
      date: toDateOnly(row.date),
    }));
    if (holdings.length === 0) {
      return { ...summary, realized };
    }

    const quotes = await this.quotes.getPrices(holdings);
    const prices = new Map(
      [...quotes.entries()].map(([symbol, quote]) => [symbol, quote.price]),
    );
    const holdingsThai = applyQuotes(summary.holdingsThai, prices);
    const holdingsForeign = applyQuotes(summary.holdingsForeign, prices);
    const thai = quotedTotals(holdingsThai);
    const foreign = quotedTotals(holdingsForeign);
    const priced = [...quotes.values()];

    return {
      ...summary,
      realized,
      holdingsThai,
      holdingsForeign,
      marketValueThb: thai.marketValue,
      marketValueUsd: foreign.marketValue,
      pnlThb: thai.pnl,
      pnlUsd: foreign.pnl,
      quotesAsOf: priced.length ? new Date().toISOString() : null,
    };
  }
}
