import {
  applyQuotes,
  computeDashboard,
  computeHoldings,
  quotedTotals,
  yahooSymbol,
} from './calc';

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
    expect(holdings[0].avgCost).toBe(150);
    expect(holdings[0].market).toBe('foreign');
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
    expect(summary.holdingsForeign).toHaveLength(0);
    expect(summary.holdingsThai).toHaveLength(0);
    expect(summary.dividendNetUsd).toBe(0);
  });

  it('keeps Thai stock cost in THB and out of USD cash', () => {
    const summary = computeDashboard(
      [{ direction: 'out', thbAmount: 35500, usdAmount: 1000 }],
      [
        {
          date: new Date('2026-01-01'),
          createdAt: new Date('2026-01-01'),
          ticker: 'PTT',
          market: 'th',
          side: 'buy',
          shares: 100,
          priceUsd: 30,
          feeUsd: 0,
        },
      ],
    );

    expect(summary.cashUsd).toBe(1000);
    expect(summary.holdingsCostThb).toBe(3000);
    expect(summary.holdingsCostUsd).toBe(0);
    expect(summary.holdingsThai[0].ticker).toBe('PTT');
  });

  it('adds net dividends to cash without counting as THB inbound', () => {
    const summary = computeDashboard(
      [{ direction: 'out', thbAmount: 35500, usdAmount: 1000 }],
      [],
      [{ grossUsd: 10, netUsd: 8.5 }],
    );

    expect(summary.thbIn).toBe(0);
    expect(summary.dividendGrossUsd).toBe(10);
    expect(summary.dividendNetUsd).toBe(8.5);
    expect(summary.cashUsd).toBe(1008.5);
  });
});

describe('yahoo quotes helpers', () => {
  it('maps Thai tickers to .BK and applies live prices', () => {
    expect(yahooSymbol('PTT', 'th')).toBe('PTT.BK');
    expect(yahooSymbol('AAPL', 'foreign')).toBe('AAPL');
    expect(yahooSymbol('PTT.BK', 'th')).toBe('PTT.BK');

    const priced = applyQuotes(
      [
        {
          ticker: 'AAPL',
          market: 'foreign',
          shares: 2,
          avgCost: 100,
          totalCost: 200,
          lastPrice: null,
          marketValue: null,
          pnl: null,
          pnlPct: null,
        },
      ],
      new Map([['AAPL', 150]]),
    );
    expect(priced[0].lastPrice).toBe(150);
    expect(priced[0].marketValue).toBe(300);
    expect(priced[0].pnl).toBe(100);
    expect(quotedTotals(priced).pnl).toBe(100);
  });
});
