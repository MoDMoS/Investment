export type User = {
  id: string;
  email: string;
  name: string;
};

export type Market = 'th' | 'foreign';

export type Account = {
  id: string;
  name: string;
  kind: Market;
  cash: number;
};

export type CashEntry = {
  id: string;
  accountId: string;
  accountName: string;
  kind: Market;
  date: string;
  direction: 'in' | 'out';
  amount: number;
  note: string;
};

export type Transfer = {
  id: string;
  accountId: string | null;
  accountName: string;
  date: string;
  direction: 'out' | 'in';
  thbAmount: number;
  usdAmount: number;
  rate: number;
  feeThb: number;
  feeUsd: number;
  note: string;
};

export type Trade = {
  id: string;
  accountId: string | null;
  accountName: string;
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
  accountId: string | null;
  accountName: string;
  date: string;
  ticker: string;
  market: Market;
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

export type RealizedLot = {
  date: string;
  ticker: string;
  market: Market;
  shares: number;
  avgCost: number;
  sellPrice: number;
  fee: number;
  pnl: number;
};

export type Dashboard = {
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
  dividendGrossThb: number;
  dividendNetThb: number;
  holdingsThai: Holding[];
  holdingsForeign: Holding[];
};

export type ExportPayload = {
  exportedAt: string;
  accounts: { id: string; name: string; kind: string }[];
  transfers: Record<string, unknown>[];
  trades: Record<string, unknown>[];
  dividends: Record<string, unknown>[];
  cashEntries: Record<string, unknown>[];
};
