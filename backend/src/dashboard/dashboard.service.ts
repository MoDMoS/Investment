import { Injectable } from '@nestjs/common';
import { applyQuotes, computeDashboard, quotedTotals } from './calc';
import { PrismaService } from '../prisma/prisma.service';
import { QuotesService } from '../quotes/quotes.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly quotes: QuotesService,
  ) {}

  async get(userId: string) {
    const [transfers, trades, dividends] = await Promise.all([
      this.prisma.fxTransfer.findMany({ where: { userId } }),
      this.prisma.trade.findMany({ where: { userId } }),
      this.prisma.dividend.findMany({ where: { userId } }),
    ]);
    const summary = computeDashboard(transfers, trades, dividends);
    const holdings = [...summary.holdingsThai, ...summary.holdingsForeign];
    if (holdings.length === 0) return summary;

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
