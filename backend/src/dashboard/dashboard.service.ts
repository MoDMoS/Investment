import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { applyQuotes, computeDashboard, quotedTotals } from './calc';
import { toDateOnly } from '../fx';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuotesService } from '../quotes/quotes.service';
import { SettingsService } from '../settings/settings.service';
import { SnapshotsService } from '../snapshots/snapshots.service';

@Injectable()
export class DashboardService {
  private readonly log = new Logger(DashboardService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: QuotesService,
    private readonly accounts: AccountsService,
    @Inject(forwardRef(() => SnapshotsService))
    private readonly snapshots: SnapshotsService,
    private readonly settings: SettingsService,
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
    const [transfers, trades, dividends, cashRows, settings, usdThb] =
      await Promise.all([
        this.prisma.fxTransfer.findMany({ where }),
        this.prisma.trade.findMany({ where }),
        this.prisma.dividend.findMany({ where }),
        this.prisma.cashEntry.findMany({
          where,
          include: { account: { select: { kind: true } } },
        }),
        this.settings.get(userId),
        this.quotes.getUsdThb().catch(() => ({ rate: null as number | null })),
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
    const realized = summary.realized.map((row) => ({
      ...row,
      date: toDateOnly(row.date),
    }));

    let holdingsThai = summary.holdingsThai;
    let holdingsForeign = summary.holdingsForeign;
    let marketValueThb = summary.marketValueThb;
    let marketValueUsd = summary.marketValueUsd;
    let pnlThb = summary.pnlThb;
    let pnlUsd = summary.pnlUsd;
    let quotesAsOf: string | null = null;

    const holdings = [...holdingsThai, ...holdingsForeign];
    if (holdings.length > 0) {
      const quotes = await this.quotes.getPrices(holdings);
      const prices = new Map(
        [...quotes.entries()].map(([symbol, quote]) => [symbol, quote.price]),
      );
      holdingsThai = applyQuotes(summary.holdingsThai, prices);
      holdingsForeign = applyQuotes(summary.holdingsForeign, prices);
      const thai = quotedTotals(holdingsThai);
      const foreign = quotedTotals(holdingsForeign);
      marketValueThb = thai.marketValue;
      marketValueUsd = foreign.marketValue;
      pnlThb = thai.pnl;
      pnlUsd = foreign.pnl;
      quotesAsOf = [...quotes.values()].length ? new Date().toISOString() : null;
    }

    const goal = settings.repatriationGoalThb;
    const result = {
      ...summary,
      realized,
      holdingsThai,
      holdingsForeign,
      marketValueThb,
      marketValueUsd,
      pnlThb,
      pnlUsd,
      quotesAsOf,
      repatriationGoalThb: goal,
      repatriationProgress:
        goal != null && goal > 0
          ? Math.min(summary.thbIn / goal, 1)
          : null,
      usdThbRate: usdThb.rate,
      rateVsAvgOut:
        summary.avgOutRate != null && usdThb.rate != null
          ? usdThb.rate - summary.avgOutRate
          : null,
    };

    if (!accountId) {
      void this.snapshots
        .upsertToday(userId, {
          cashUsd: result.cashUsd,
          cashThb: result.cashThb,
          marketValueUsd: result.marketValueUsd,
          marketValueThb: result.marketValueThb,
          holdingsCostUsd: result.holdingsCostUsd,
          holdingsCostThb: result.holdingsCostThb,
          thbNetAbroad: result.thbNetAbroad,
        })
        .catch((err) =>
          this.log.warn(`snapshot ไม่สำเร็จ: ${String(err)}`),
        );
    }

    return result;
  }
}
