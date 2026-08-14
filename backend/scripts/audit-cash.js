const { PrismaClient } = require('@prisma/client');

const p = new PrismaClient();

function round(v) {
  if (!Number.isFinite(v)) return 0;
  const n = Math.round((v + Number.EPSILON) * 1e2) / 1e2;
  return n === 0 ? 0 : n;
}

(async () => {
  const transfers = await p.fxTransfer.findMany({ orderBy: { date: 'asc' } });
  const trades = await p.trade.findMany({ orderBy: { date: 'asc' } });
  const dividends = await p.dividend.findMany({ orderBy: { date: 'asc' } });
  const cash = await p.cashEntry.findMany({
    include: { account: true },
    orderBy: { date: 'asc' },
  });

  let usdOut = 0;
  let usdIn = 0;
  let thbOut = 0;
  let thbIn = 0;
  for (const t of transfers) {
    if (t.direction === 'out') {
      usdOut = round(usdOut + t.usdAmount);
      thbOut = round(thbOut + t.thbAmount);
    } else {
      usdIn = round(usdIn + t.usdAmount);
      thbIn = round(thbIn + t.thbAmount);
    }
  }

  let buy = 0;
  let sell = 0;
  const foreignBuys = [];
  const foreignSells = [];
  for (const t of trades) {
    const notional = t.shares * t.priceUsd;
    const cost = round(t.side === 'buy' ? notional + t.feeUsd : notional - t.feeUsd);
    if (t.market === 'th') continue;
    if (t.side === 'buy') {
      buy = round(buy + cost);
      foreignBuys.push({
        date: t.date.toISOString().slice(0, 10),
        ticker: t.ticker,
        shares: t.shares,
        price: t.priceUsd,
        fee: t.feeUsd,
        total: cost,
      });
    } else {
      sell = round(sell + cost);
      foreignSells.push({
        date: t.date.toISOString().slice(0, 10),
        ticker: t.ticker,
        shares: t.shares,
        price: t.priceUsd,
        fee: t.feeUsd,
        total: cost,
      });
    }
  }

  const divNet = round(dividends.reduce((s, d) => s + d.netUsd, 0));
  let cashIn = 0;
  let cashOut = 0;
  for (const c of cash) {
    if (c.account.kind !== 'foreign') continue;
    if (c.direction === 'in') cashIn = round(cashIn + c.amount);
    else cashOut = round(cashOut + c.amount);
  }

  const cashUsd = round(usdOut - usdIn - buy + sell + divNet + cashIn - cashOut);

  console.log(
    JSON.stringify(
      {
        thbOut,
        thbIn,
        usdOut,
        usdIn,
        foreignBuyTotal: buy,
        foreignSellTotal: sell,
        divNet,
        cashIn,
        cashOut,
        cashUsd,
        parts: {
          usdOut,
          minusUsdIn: -usdIn,
          minusBuys: -buy,
          plusSells: sell,
          plusDiv: divNet,
          plusCashIn: cashIn,
          minusCashOut: -cashOut,
        },
        transfers: transfers.map((t) => ({
          date: t.date.toISOString().slice(0, 10),
          dir: t.direction,
          thb: t.thbAmount,
          usd: t.usdAmount,
          rate: t.rate,
          feeUsd: t.feeUsd,
          note: t.note,
        })),
        foreignBuys,
        foreignSells,
        dividends: dividends.map((d) => ({
          date: d.date.toISOString().slice(0, 10),
          ticker: d.ticker,
          gross: d.grossUsd,
          tax: d.taxUsd,
          net: d.netUsd,
        })),
        cashEntries: cash
          .filter((c) => c.account.kind === 'foreign')
          .map((c) => ({
            date: c.date.toISOString().slice(0, 10),
            dir: c.direction,
            amount: c.amount,
            note: c.note,
          })),
      },
      null,
      2,
    ),
  );

  await p.$disconnect();
})().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
  process.exit(1);
});
