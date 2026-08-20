import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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

type SecFundRef = {
  projId: string;
  fundClassName: string;
};

type SecFundCacheEntry = {
  ref: SecFundRef | null;
  at: number;
};

type SecPaginated<T> = {
  message?: string;
  page_size?: number;
  next_cursor?: string;
  items?: T[];
};

type SecFundProfile = {
  proj_id?: string;
  proj_abbr_name?: string;
  fund_class_name?: string;
  fund_status?: string;
};

type SecDailyNav = {
  proj_id?: string;
  nav_date?: string;
  fund_class_name?: string;
  last_val?: number;
  sell_price?: number;
};

const PRICE_TTL_MS = 2 * 60 * 1000;
const FUND_REF_TTL_MS = 24 * 60 * 60 * 1000;
const FUND_MISS_TTL_MS = 60 * 60 * 1000;
const SEC_BASE = 'https://api.sec.or.th';
const HEADERS_JSON = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

@Injectable()
export class QuotesService {
  private readonly log = new Logger(QuotesService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly fundRefCache = new Map<string, SecFundCacheEntry>();
  private readonly secApiKey: string | undefined;

  constructor(config: ConfigService) {
    this.secApiKey = config.get<string>('SEC_API_KEY')?.trim() || undefined;
    if (!this.secApiKey) {
      this.log.warn('SEC_API_KEY ไม่ได้ตั้ง — จะดึงราคาได้เฉพาะ Yahoo');
    }
  }

  async getPrices(
    holdings: { ticker: string; market: 'th' | 'foreign' }[],
  ): Promise<Map<string, QuotePrice>> {
    const result = new Map<string, QuotePrice>();
    await Promise.all(
      holdings.map(async (row) => {
        const symbol = yahooSymbol(row.ticker, row.market);
        if (!symbol) return;
        const quote = await this.getPriceForHolding(
          row.ticker,
          row.market,
          symbol,
        );
        if (!quote) return;
        result.set(symbol, quote);
        result.set(row.ticker.trim().toUpperCase(), quote);
      }),
    );
    return result;
  }

  async getUsdThb() {
    const quote = await this.getYahooQuote('USDTHB=X');
    if (!quote) {
      return { rate: null, asOf: null };
    }
    return {
      rate: quote.price,
      asOf: new Date().toISOString(),
      stale: quote.stale,
    };
  }

  private async getPriceForHolding(
    ticker: string,
    market: 'th' | 'foreign',
    symbol: string,
  ): Promise<QuotePrice | null> {
    // กองทุนไทยไม่มีบน Yahoo — ไป SEC ตรงๆ เพื่อไม่ spam 404
    if (market === 'th' && this.secApiKey && looksLikeThaiFund(ticker)) {
      return this.getSecQuote(ticker, symbol);
    }

    const yahoo = await this.getYahooQuote(symbol);
    if (yahoo) return yahoo;

    if (market !== 'th' || !this.secApiKey) return null;

    return this.getSecQuote(ticker, symbol);
  }

  private async getYahooQuote(symbol: string): Promise<QuotePrice | null> {
    const cached = this.cache.get(symbol);
    if (cached && Date.now() - cached.at < PRICE_TTL_MS) {
      return { symbol, price: cached.price, stale: false };
    }

    try {
      const price = await this.fetchYahoo(symbol);
      if (price != null && price > 0) {
        this.cache.set(symbol, { price, at: Date.now() });
        return { symbol, price, stale: false };
      }
    } catch (error) {
      // 404 = ไม่มีสัญลักษณ์ (เช่น กองทุนที่พลาด heuristic) — ไม่ต้อง warn ซ้ำๆ
      const msg = String(error);
      if (!msg.includes('HTTP 404')) {
        this.log.warn(`ดึงราคา Yahoo ${symbol} ไม่สำเร็จ: ${msg}`);
      }
    }

    if (cached) {
      return { symbol, price: cached.price, stale: true };
    }
    return null;
  }

  private async getSecQuote(
    ticker: string,
    symbol: string,
  ): Promise<QuotePrice | null> {
    const cacheKey = `sec:${ticker.trim().toUpperCase()}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.at < PRICE_TTL_MS) {
      return { symbol, price: cached.price, stale: false };
    }

    try {
      const ref = await this.resolveSecFund(ticker);
      if (!ref) {
        if (cached) return { symbol, price: cached.price, stale: true };
        return null;
      }
      const price = await this.fetchSecNav(ref);
      if (price != null && price > 0) {
        this.cache.set(cacheKey, { price, at: Date.now() });
        return { symbol, price, stale: false };
      }
    } catch (error) {
      this.log.warn(`ดึง NAV SEC ${ticker} ไม่สำเร็จ: ${String(error)}`);
    }

    if (cached) {
      return { symbol, price: cached.price, stale: true };
    }
    return null;
  }

  private async resolveSecFund(ticker: string): Promise<SecFundRef | null> {
    const key = ticker.trim().toUpperCase();
    const cached = this.fundRefCache.get(key);
    if (cached) {
      const ttl = cached.ref ? FUND_REF_TTL_MS : FUND_MISS_TTL_MS;
      if (Date.now() - cached.at < ttl) return cached.ref;
    }

    const ref =
      (await this.lookupSecByFundClass(key)) ??
      (await this.lookupSecByProjectInfo(key)) ??
      (await this.lookupSecByBaseAbbr(key));

    this.fundRefCache.set(key, { ref, at: Date.now() });
    if (ref) {
      this.log.log(
        `SEC map ${key} → proj=${ref.projId} class=${ref.fundClassName}`,
      );
    }
    return ref;
  }

  private async lookupSecByFundClass(
    ticker: string,
  ): Promise<SecFundRef | null> {
    const items = await this.fetchSecProfiles({
      fund_class_name: ticker,
      fund_status: 'Registered',
      page_size: '20',
    });
    return pickSecFundRef(items, ticker);
  }

  private async lookupSecByProjectInfo(
    ticker: string,
  ): Promise<SecFundRef | null> {
    const items = await this.fetchSecProfiles({
      project_info: ticker,
      fund_status: 'Registered',
      page_size: '50',
    });
    return pickSecFundRef(items, ticker);
  }

  private async lookupSecByBaseAbbr(
    ticker: string,
  ): Promise<SecFundRef | null> {
    const base = stripFundClassSuffix(ticker);
    if (!base || base === ticker) return null;
    const items = await this.fetchSecProfiles({
      project_info: base,
      fund_status: 'Registered',
      page_size: '50',
    });
    return pickSecFundRef(items, ticker);
  }

  private async fetchSecProfiles(
    params: Record<string, string>,
  ): Promise<SecFundProfile[]> {
    const qs = new URLSearchParams(params);
    const data = await this.secGet<SecPaginated<SecFundProfile>>(
      `/v2/fund/general-info/profiles?${qs}`,
    );
    return data.items ?? [];
  }

  private async fetchSecNav(ref: SecFundRef): Promise<number | null> {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 45);
    const qs = new URLSearchParams({
      proj_id: ref.projId,
      fund_class_name: ref.fundClassName,
      start_nav_date: toIsoDate(start),
      end_nav_date: toIsoDate(end),
      page_size: '100',
    });
    const data = await this.secGet<SecPaginated<SecDailyNav>>(
      `/v2/fund/daily-info/nav?${qs}`,
    );
    const rows = (data.items ?? []).filter(
      (row) =>
        !row.fund_class_name ||
        row.fund_class_name.toUpperCase() === ref.fundClassName.toUpperCase(),
    );
    if (rows.length === 0) return null;
    rows.sort((a, b) => (a.nav_date ?? '').localeCompare(b.nav_date ?? ''));
    const latest = rows[rows.length - 1];
    const price = latest.last_val ?? latest.sell_price;
    return typeof price === 'number' && Number.isFinite(price) && price > 0
      ? price
      : null;
  }

  private async secGet<T>(path: string): Promise<T> {
    if (!this.secApiKey) {
      throw new Error('SEC_API_KEY missing');
    }
    const response = await fetch(`${SEC_BASE}${path}`, {
      headers: {
        ...HEADERS_JSON,
        'Ocp-Apim-Subscription-Key': this.secApiKey,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (response.status === 204) {
      return { items: [] } as T;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }

  private async fetchYahoo(symbol: string): Promise<number | null> {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const response = await fetch(url, {
      headers: HEADERS_JSON,
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

/** Exported for unit tests — เช่น K-US500X-A(A), K-USXNDQ-A(D) */
export function looksLikeThaiFund(ticker: string): boolean {
  return /^[A-Z0-9][A-Z0-9-]*-[A-Z]\([^)]+\)$/i.test(ticker.trim());
}

/** Exported for unit tests */
export function stripFundClassSuffix(ticker: string): string | null {
  const match = ticker
    .trim()
    .toUpperCase()
    .match(/^(.+)-[A-Z]\([^)]+\)$/);
  return match?.[1] ?? null;
}

/** Exported for unit tests */
export function pickSecFundRef(
  items: SecFundProfile[],
  ticker: string,
): SecFundRef | null {
  const want = ticker.trim().toUpperCase();
  const registered = items.filter(
    (row) =>
      row.proj_id &&
      (!row.fund_status || row.fund_status.toUpperCase() === 'REGISTERED'),
  );
  const byClass = registered.find(
    (row) => row.fund_class_name?.toUpperCase() === want,
  );
  if (byClass?.proj_id && byClass.fund_class_name) {
    return { projId: byClass.proj_id, fundClassName: byClass.fund_class_name };
  }
  const byAbbr = registered.find(
    (row) => row.proj_abbr_name?.toUpperCase() === want,
  );
  if (byAbbr?.proj_id) {
    return {
      projId: byAbbr.proj_id,
      fundClassName: byAbbr.fund_class_name || 'main',
    };
  }
  return null;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
