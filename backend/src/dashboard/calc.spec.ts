import { computeDashboard, computeHoldings } from './calc';

describe('computeHoldings', () => {
  it('uses weighted average after buys and reduces cost on sell', () => {
    const holdings = computeHoldings([
      {
        date: new Date('2026-01-01'),
        createdAt: new Date('2026-01-01'),
        ticker: 'AAPL',
        side: 'buy',
        shares: 2,
        priceUsd: 100,
        feeUsd: 0,
      },
      {
        date: new Date('2026-01-02'),
        createdAt: new Date('2026-01-02'),
        ticker: 'AAPL',
        side: 'buy',
        shares: 2,
        priceUsd: 200,
        feeUsd: 0,
      },
      {
        date: new Date('2026-01-03'),
        createdAt: new Date('2026-01-03'),
        ticker: 'AAPL',
        side: 'sell',
        shares: 1,
        priceUsd: 180,
        feeUsd: 0,
      },
    ]);

    expect(holdings).toHaveLength(1);
    expect(holdings[0].shares).toBe(3);
    expect(holdings[0].avgCostUsd).toBe(150);
  });
});

describe('computeDashboard', () => {
  it('keeps repatriation separate from stock sales', () => {
    const summary = computeDashboard(
      [
        { direction: 'out', thbAmount: 35500, usdAmount: 1000 },
        { direction: 'in', thbAmount: 17000, usdAmount: 500 },
      ],
      [
        {
          date: new Date('2026-01-01'),
          createdAt: new Date('2026-01-01'),
          ticker: 'AAPL',
          side: 'buy',
          shares: 1,
          priceUsd: 200,
          feeUsd: 0,
        },
        {
          date: new Date('2026-01-02'),
          createdAt: new Date('2026-01-02'),
          ticker: 'AAPL',
          side: 'sell',
          shares: 1,
          priceUsd: 250,
          feeUsd: 0,
        },
      ],
    );

    expect(summary.thbOut).toBe(35500);
    expect(summary.thbIn).toBe(17000);
    expect(summary.thbNetAbroad).toBe(18500);
    expect(summary.cashUsd).toBe(550);
    expect(summary.holdings).toHaveLength(0);
  });
});
