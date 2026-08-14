import { Injectable, Logger } from '@nestjs/common';
import { yahooSymbol } from '../dashboard/calc';

export type QuotePrice = {
  symbol: string;
  price: number;
  stale: boolean;
};

type CacheEntry = {
  price: number;
  at: number;
};

const TTL_MS = 2 * 60 * 1000;
const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

@Injectable()
export class QuotesService {
  private readonly log = new Logger(QuotesService.name);
  private readonly cache = new Map<string, CacheEntry>();

  async getPrices(
    holdings: { ticker: string; market: 'th' | 'foreign' }[],
  ): Promise<Map<string, QuotePrice>> {
    const symbols = [
      ...new Set(
        holdings.map((row) => yahooSymbol(row.ticker, row.market)).filter(Boolean),
      ),
    ];
    const result = new Map<string, QuotePrice>();
    await Promise.all(
      symbols.map(async (symbol) => {
        const quote = await this.getPrice(symbol);
        if (quote) result.set(symbol, quote);
      }),
    );
    return result;
  }

  async getUsdThb() {
    const quote = await this.getPrice('USDTHB=X');
    if (!quote) {
      return { rate: null, asOf: null };
    }
    return { rate: quote.price, asOf: new Date().toISOString(), stale: quote.stale };
  }

  private async getPrice(symbol: string): Promise<QuotePrice | null> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.at < TTL_MS) {
      return { symbol, price: cached.price, stale: false };
    }

    try {
      const price = await this.fetchYahoo(symbol);
      if (price != null && price > 0) {
        this.cache.set(symbol, { price, at: Date.now() });
        return { symbol, price, stale: false };
      }
    } catch (error) {
      this.log.warn(`ดึงราคา ${symbol} ไม่สำเร็จ: ${String(error)}`);
    }

    if (cached) {
      return { symbol, price: cached.price, stale: true };
    }
    return null;
  }

  private async fetchYahoo(symbol: string): Promise<number | null> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const response = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = (await response.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; previousClose?: number };
        }>;
      };
    };
    const meta = data.chart?.result?.[0]?.meta;
    const price = meta?.regularMarketPrice ?? meta?.previousClose;
    return typeof price === 'number' && Number.isFinite(price) ? price : null;
  }
}
