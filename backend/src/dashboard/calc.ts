export type TransferRow = {
  direction: string;
  thbAmount: number;
  usdAmount: number;
  accountId?: string | null;
};

export type TradeRow = {
  date: Date;
  createdAt: Date;
  ticker: string;
  market?: string;
  side: string;
  shares: number;
  priceUsd: number;
  feeUsd: number;
  accountId?: string | null;
};

export type Holding = {
  ticker: string;
  market: 'th' | 'foreign';
  shares: number;
  avgCost: number;
  totalCost: number;
  lastPrice: number | null;
  marketValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
};

export type RealizedLot = {
  date: Date;
  ticker: string;
  market: 'th' | 'foreign';
  shares: number;
  avgCost: number;
  sellPrice: number;
  fee: number;
  pnl: number;
};

export type DividendRow = {
  netUsd: number;
  grossUsd: number;
  accountId?: string | null;
};

export type CashEntryRow = {
  accountId: string;
  direction: string;
  amount: number;
  kind: 'th' | 'foreign';
};

export type AccountCash = {
  accountId: string;
  name: string;
  kind: 'th' | 'foreign';
  cash: number;
};

export type DashboardSummary = {
  thbOut: number;
  thbIn: number;
  thbNetAbroad: number;
  avgOutRate: number | null;
  cashUsd: number;
  cashThb: number;
  holdingsCostUsd: number;
  holdingsCostThb: number;
  marketValueUsd: number | null;
  marketValueThb: number | null;
  pnlUsd: number | null;
  pnlThb: number | null;
  realizedPnlUsd: number;
  realizedPnlThb: number;
  realized: RealizedLot[];
  quotesAsOf: string | null;
  dividendGrossUsd: number;
  dividendNetUsd: number;
  holdingsThai: Holding[];
  holdingsForeign: Holding[];
  accountCash: AccountCash[];
};

export function isThaiMarket(market?: string) {
  return market === 'th';
}

export function tradeCost(trade: TradeRow): number {
  const notional = trade.shares * trade.priceUsd;
  return trade.side === 'buy' ? notional + trade.feeUsd : notional - trade.feeUsd;
}

export function tradeCostUsd(trade: TradeRow): number {
  if (isThaiMarket(trade.market)) return 0;
  return tradeCost(trade);
}

export function tradeCostThb(trade: TradeRow): number {
  if (!isThaiMarket(trade.market)) return 0;
  return tradeCost(trade);
}

export function computePositions(trades: TradeRow[]): {
  holdings: Holding[];
  realized: RealizedLot[];
} {
  const map = new Map<string, { market: 'th' | 'foreign'; shares: number; cost: number }>();
  const realized: RealizedLot[] = [];
  const sorted = [...trades].sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) return byDate;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  for (const trade of sorted) {
    const market: 'th' | 'foreign' = isThaiMarket(trade.market) ? 'th' : 'foreign';
    const ticker = trade.ticker.toUpperCase();
    const key = `${market}:${ticker}`;
    const current = map.get(key) ?? { market, shares: 0, cost: 0 };
    if (trade.side === 'buy') {
      current.shares += trade.shares;
      current.cost += trade.shares * trade.priceUsd + trade.feeUsd;
    } else {
      const avg = current.shares > 0 ? current.cost / current.shares : 0;
      const proceeds = trade.shares * trade.priceUsd - trade.feeUsd;
      const cost = avg * trade.shares;
      realized.push({
        date: trade.date,
        ticker,
        market,
        shares: trade.shares,
        avgCost: avg,
        sellPrice: trade.priceUsd,
        fee: trade.feeUsd,
        pnl: proceeds - cost,
      });
      current.shares -= trade.shares;
      current.cost -= cost;
      if (current.shares <= 1e-10) {
        current.shares = 0;
        current.cost = 0;
      }
    }
    map.set(key, current);
  }

  const holdings = [...map.entries()]
    .filter(([, value]) => value.shares > 1e-10)
    .map(([key, value]) => ({
      ticker: key.slice(key.indexOf(':') + 1),
      market: value.market,
      shares: value.shares,
      avgCost: value.cost / value.shares,
      totalCost: value.cost,
      lastPrice: null,
      marketValue: null,
      pnl: null,
      pnlPct: null,
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));

  realized.sort((a, b) => b.date.getTime() - a.date.getTime());
  return { holdings, realized };
}

export function computeHoldings(trades: TradeRow[]): Holding[] {
  return computePositions(trades).holdings;
}

function cashFromEntries(entries: CashEntryRow[], kind: 'th' | 'foreign') {
  let cash = 0;
  for (const entry of entries) {
    if (entry.kind !== kind) continue;
    cash += entry.direction === 'in' ? entry.amount : -entry.amount;
  }
  return cash;
}

function computeCash(
  transfers: TransferRow[],
  trades: TradeRow[],
  dividends: DividendRow[],
  cashEntries: CashEntryRow[],
) {
  let thbOut = 0;
  let thbIn = 0;
  let usdOut = 0;
  let usdIn = 0;

  for (const transfer of transfers) {
    if (transfer.direction === 'out') {
      thbOut += transfer.thbAmount;
      usdOut += transfer.usdAmount;
    } else {
      thbIn += transfer.thbAmount;
      usdIn += transfer.usdAmount;
    }
  }

  let tradeCashUsd = 0;
  let tradeCashThb = 0;
  for (const trade of trades) {
    const usd = tradeCostUsd(trade);
    const thb = tradeCostThb(trade);
    if (usd) tradeCashUsd += trade.side === 'buy' ? -usd : usd;
    if (thb) tradeCashThb += trade.side === 'buy' ? -thb : thb;
  }

  const dividendGrossUsd = dividends.reduce((sum, row) => sum + row.grossUsd, 0);
  const dividendNetUsd = dividends.reduce((sum, row) => sum + row.netUsd, 0);

  return {
    thbOut,
    thbIn,
    usdOut,
    usdIn,
    tradeCashUsd,
    tradeCashThb,
    dividendGrossUsd,
    dividendNetUsd,
    cashUsd:
      usdOut - usdIn + tradeCashUsd + dividendNetUsd + cashFromEntries(cashEntries, 'foreign'),
    cashThb: cashFromEntries(cashEntries, 'th') + tradeCashThb,
  };
}

export function computeAccountCash(
  accounts: { id: string; name: string; kind: string }[],
  transfers: TransferRow[],
  trades: TradeRow[],
  dividends: DividendRow[],
  cashEntries: CashEntryRow[],
): AccountCash[] {
  return accounts.map((account) => {
    const kind: 'th' | 'foreign' = account.kind === 'th' ? 'th' : 'foreign';
    const cash = computeCash(
      transfers.filter((row) => row.accountId === account.id),
      trades.filter((row) => row.accountId === account.id),
      dividends.filter((row) => row.accountId === account.id),
      cashEntries.filter((row) => row.accountId === account.id),
    );
    return {
      accountId: account.id,
      name: account.name,
      kind,
      cash: kind === 'th' ? cash.cashThb : cash.cashUsd,
    };
  });
}

export function computeDashboard(
  transfers: TransferRow[],
  trades: TradeRow[],
  dividends: DividendRow[] = [],
  cashEntries: CashEntryRow[] = [],
  accounts: { id: string; name: string; kind: string }[] = [],
): DashboardSummary {
  const cash = computeCash(transfers, trades, dividends, cashEntries);
  const { holdings, realized } = computePositions(trades);
  const holdingsThai = holdings.filter((row) => row.market === 'th');
  const holdingsForeign = holdings.filter((row) => row.market === 'foreign');
  const holdingsCostThb = holdingsThai.reduce((sum, row) => sum + row.totalCost, 0);
  const holdingsCostUsd = holdingsForeign.reduce((sum, row) => sum + row.totalCost, 0);
  const realizedThai = realized.filter((row) => row.market === 'th');
  const realizedForeign = realized.filter((row) => row.market === 'foreign');

  return {
    thbOut: cash.thbOut,
    thbIn: cash.thbIn,
    thbNetAbroad: cash.thbOut - cash.thbIn,
    avgOutRate: cash.usdOut > 0 ? cash.thbOut / cash.usdOut : null,
    cashUsd: cash.cashUsd,
    cashThb: cash.cashThb,
    holdingsCostUsd,
    holdingsCostThb,
    marketValueUsd: null,
    marketValueThb: null,
    pnlUsd: null,
    pnlThb: null,
    realizedPnlUsd: realizedForeign.reduce((sum, row) => sum + row.pnl, 0),
    realizedPnlThb: realizedThai.reduce((sum, row) => sum + row.pnl, 0),
    realized,
    quotesAsOf: null,
    dividendGrossUsd: cash.dividendGrossUsd,
    dividendNetUsd: cash.dividendNetUsd,
    holdingsThai,
    holdingsForeign,
    accountCash: computeAccountCash(accounts, transfers, trades, dividends, cashEntries),
  };
}

export function yahooSymbol(ticker: string, market: 'th' | 'foreign') {
  const symbol = ticker.trim().toUpperCase();
  if (!symbol) return symbol;
  if (symbol.includes('.')) return symbol;
  return market === 'th' ? `${symbol}.BK` : symbol;
}

export function applyQuotes(
  holdings: Holding[],
  prices: Map<string, number>,
): Holding[] {
  return holdings.map((row) => {
    const price =
      prices.get(yahooSymbol(row.ticker, row.market)) ?? prices.get(row.ticker.toUpperCase());
    if (price == null) return row;
    const marketValue = row.shares * price;
    const pnl = marketValue - row.totalCost;
    return {
      ...row,
      lastPrice: price,
      marketValue,
      pnl,
      pnlPct: row.totalCost > 0 ? pnl / row.totalCost : null,
    };
  });
}

export function quotedTotals(holdings: Holding[]) {
  const priced = holdings.filter((row) => row.marketValue != null && row.pnl != null);
  if (priced.length === 0) {
    return { marketValue: null as number | null, pnl: null as number | null };
  }
  return {
    marketValue: priced.reduce((sum, row) => sum + (row.marketValue ?? 0), 0),
    pnl: priced.reduce((sum, row) => sum + (row.pnl ?? 0), 0),
  };
}
