export type User = {
  id: string;
  email: string;
  name: string;
};

export type Transfer = {
  id: string;
  date: string;
  direction: 'out' | 'in';
  thbAmount: number;
  usdAmount: number;
  rate: number;
  feeThb: number;
  feeUsd: number;
  note: string;
};

export type Market = 'th' | 'foreign';

export type Trade = {
  id: string;
  date: string;
  ticker: string;
  market: Market;
  side: 'buy' | 'sell';
  shares: number;
  priceUsd: number;
  feeUsd: number;
  note: string;
  totalUsd: number;
  cashWarning?: boolean;
};

export type Dividend = {
  id: string;
  date: string;
  ticker: string;
  shares: number;
  grossUsd: number;
  taxUsd: number;
  netUsd: number;
  note: string;
};

export type Holding = {
  ticker: string;
  market: Market;
  shares: number;
  avgCost: number;
  totalCost: number;
  lastPrice: number | null;
  marketValue: number | null;
  pnl: number | null;
  pnlPct: number | null;
};

export type Dashboard = {
  thbOut: number;
  thbIn: number;
  thbNetAbroad: number;
  avgOutRate: number | null;
  cashUsd: number;
  holdingsCostUsd: number;
  holdingsCostThb: number;
  marketValueUsd: number | null;
  marketValueThb: number | null;
  pnlUsd: number | null;
  pnlThb: number | null;
  quotesAsOf: string | null;
  dividendGrossUsd: number;
  dividendNetUsd: number;
  holdingsThai: Holding[];
  holdingsForeign: Holding[];
};
