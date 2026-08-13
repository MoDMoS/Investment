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

export type Trade = {
  id: string;
  date: string;
  ticker: string;
  side: 'buy' | 'sell';
  shares: number;
  priceUsd: number;
  feeUsd: number;
  note: string;
  totalUsd: number;
  cashWarning?: boolean;
};

export type Holding = {
  ticker: string;
  shares: number;
  avgCostUsd: number;
  totalCostUsd: number;
};

export type Dashboard = {
  thbOut: number;
  thbIn: number;
  thbNetAbroad: number;
  avgOutRate: number | null;
  cashUsd: number;
  holdingsCostUsd: number;
  holdings: Holding[];
};
