export type TransferRow = {
  direction: string;
  thbAmount: number;
  usdAmount: number;
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
};

export type Holding = {
  ticker: string;
  market: 'th' | 'foreign';
  shares: number;
  avgCost: number;
  totalCost: number;
};

export type DividendRow = {
  netUsd: number;
  grossUsd: number;
};

export type DashboardSummary = {
  thbOut: number;
  thbIn: number;
  thbNetAbroad: number;
  avgOutRate: number | null;
  cashUsd: number;
  holdingsCostUsd: number;
  holdingsCostThb: number;
  dividendGrossUsd: number;
  dividendNetUsd: number;
  holdingsThai: Holding[];
  holdingsForeign: Holding[];
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

export function computeHoldings(trades: TradeRow[]): Holding[] {
  const map = new Map<string, { market: 'th' | 'foreign'; shares: number; cost: number }>();
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
      current.shares -= trade.shares;
      current.cost -= avg * trade.shares;
      if (current.shares <= 1e-10) {
        current.shares = 0;
        current.cost = 0;
      }
    }
    map.set(key, current);
  }

  return [...map.entries()]
    .filter(([, value]) => value.shares > 1e-10)
    .map(([key, value]) => ({
      ticker: key.slice(key.indexOf(':') + 1),
      market: value.market,
      shares: value.shares,
      avgCost: value.cost / value.shares,
      totalCost: value.cost,
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export function computeDashboard(
  transfers: TransferRow[],
  trades: TradeRow[],
  dividends: DividendRow[] = [],
): DashboardSummary {
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

  let tradeCash = 0;
  for (const trade of trades) {
    const amount = tradeCostUsd(trade);
    if (!amount) continue;
    tradeCash += trade.side === 'buy' ? -amount : amount;
  }

  const holdings = computeHoldings(trades);
  const holdingsThai = holdings.filter((row) => row.market === 'th');
  const holdingsForeign = holdings.filter((row) => row.market === 'foreign');
  const holdingsCostThb = holdingsThai.reduce((sum, row) => sum + row.totalCost, 0);
  const holdingsCostUsd = holdingsForeign.reduce((sum, row) => sum + row.totalCost, 0);
  const dividendGrossUsd = dividends.reduce((sum, row) => sum + row.grossUsd, 0);
  const dividendNetUsd = dividends.reduce((sum, row) => sum + row.netUsd, 0);

  return {
    thbOut,
    thbIn,
    thbNetAbroad: thbOut - thbIn,
    avgOutRate: usdOut > 0 ? thbOut / usdOut : null,
    cashUsd: usdOut - usdIn + tradeCash + dividendNetUsd,
    holdingsCostUsd,
    holdingsCostThb,
    dividendGrossUsd,
    dividendNetUsd,
    holdingsThai,
    holdingsForeign,
  };
}
