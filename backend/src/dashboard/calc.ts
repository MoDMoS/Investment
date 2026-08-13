export type TransferRow = {
  direction: string;
  thbAmount: number;
  usdAmount: number;
};

export type TradeRow = {
  date: Date;
  createdAt: Date;
  ticker: string;
  side: string;
  shares: number;
  priceUsd: number;
  feeUsd: number;
};

export type Holding = {
  ticker: string;
  shares: number;
  avgCostUsd: number;
  totalCostUsd: number;
};

export type DashboardSummary = {
  thbOut: number;
  thbIn: number;
  thbNetAbroad: number;
  avgOutRate: number | null;
  cashUsd: number;
  holdingsCostUsd: number;
  holdings: Holding[];
};

export function tradeCostUsd(trade: TradeRow): number {
  const notional = trade.shares * trade.priceUsd;
  return trade.side === 'buy' ? notional + trade.feeUsd : notional - trade.feeUsd;
}

export function computeHoldings(trades: TradeRow[]): Holding[] {
  const map = new Map<string, { shares: number; cost: number }>();
  const sorted = [...trades].sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime();
    if (byDate !== 0) return byDate;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  for (const trade of sorted) {
    const ticker = trade.ticker.toUpperCase();
    const current = map.get(ticker) ?? { shares: 0, cost: 0 };
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
    map.set(ticker, current);
  }

  return [...map.entries()]
    .filter(([, value]) => value.shares > 1e-10)
    .map(([ticker, value]) => ({
      ticker,
      shares: value.shares,
      avgCostUsd: value.cost / value.shares,
      totalCostUsd: value.cost,
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export function computeDashboard(
  transfers: TransferRow[],
  trades: TradeRow[],
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
    tradeCash += trade.side === 'buy' ? -amount : amount;
  }

  const holdings = computeHoldings(trades);
  const holdingsCostUsd = holdings.reduce((sum, row) => sum + row.totalCostUsd, 0);

  return {
    thbOut,
    thbIn,
    thbNetAbroad: thbOut - thbIn,
    avgOutRate: usdOut > 0 ? thbOut / usdOut : null,
    cashUsd: usdOut - usdIn + tradeCash,
    holdingsCostUsd,
    holdings,
  };
}
