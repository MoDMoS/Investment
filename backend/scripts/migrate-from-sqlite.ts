/**
 * Migrate Investment ledger data from SQLite → Postgres.
 *
 * Prerequisites:
 * - backend/.env has Postgres DATABASE_URL (e.g. localhost:5434)
 * - `npx prisma migrate deploy` already applied on Postgres
 * - SQLite file still available (backup recommended)
 *
 * Usage:
 *   SQLITE_PATH=../data/app.db npm run migrate:from-sqlite
 *   # or default: prisma/dev.db / ../data/app.db
 *
 * Preserves all IDs so Portal JWT `sub` still matches User.id.
 */
import { PrismaClient } from '@prisma/client';
import { DatabaseSync } from 'node:sqlite';
import * as fs from 'node:fs';
import * as path from 'node:path';

type Row = Record<string, unknown>;

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing env ${name}`);
  return value;
}

function resolveSqlitePath() {
  const fromEnv = process.env.SQLITE_PATH?.trim();
  if (fromEnv) return path.resolve(fromEnv);

  const candidates = [
    path.join(__dirname, '..', '..', 'data', 'app.db'),
    path.join(__dirname, '..', 'prisma', 'dev.db'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(
    'SQLite file not found. Set SQLITE_PATH to app.db (e.g. ../data/app.db)',
  );
}

function tableExists(db: DatabaseSync, name: string) {
  const row = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`)
    .get(name) as { name?: string } | undefined;
  return Boolean(row?.name);
}

function allRows(db: DatabaseSync, table: string): Row[] {
  if (!tableExists(db, table)) {
    console.warn(`Skip missing table: ${table}`);
    return [];
  }
  return db.prepare(`SELECT * FROM ${table}`).all() as Row[];
}

function asString(value: unknown, fallback = '') {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asNullableString(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  return String(value);
}

function asNumber(value: unknown, fallback = 0) {
  if (value === null || value === undefined || value === '') return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asDate(value: unknown) {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // SQLite may store ms epoch or seconds
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms);
  }
  const s = String(value);
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid date: ${s}`);
  }
  return d;
}

async function main() {
  requiredEnv('DATABASE_URL');
  if (process.env.DATABASE_URL?.includes('file:')) {
    throw new Error('DATABASE_URL must point to Postgres, not SQLite file:');
  }

  const sqlitePath = resolveSqlitePath();
  const sqlite = new DatabaseSync(sqlitePath, { readOnly: true });
  const prisma = new PrismaClient();

  const users = allRows(sqlite, 'User');
  const accounts = allRows(sqlite, 'Account');
  const transfers = allRows(sqlite, 'FxTransfer');
  const trades = allRows(sqlite, 'Trade');
  const dividends = allRows(sqlite, 'Dividend');
  const cashEntries = allRows(sqlite, 'CashEntry');
  const snapshots = allRows(sqlite, 'PortfolioSnapshot');

  console.log(`Source ${sqlitePath}`);
  console.log(
    `users=${users.length} accounts=${accounts.length} transfers=${transfers.length} trades=${trades.length} dividends=${dividends.length} cash=${cashEntries.length} snapshots=${snapshots.length}`,
  );

  for (const u of users) {
    await prisma.user.upsert({
      where: { id: asString(u.id) },
      create: {
        id: asString(u.id),
        email: asString(u.email).toLowerCase(),
        name: asString(u.name),
        passwordHash: asString(u.passwordHash, ''),
        repatriationGoalThb: asNullableNumber(u.repatriationGoalThb),
        createdAt: u.createdAt ? asDate(u.createdAt) : undefined,
      },
      update: {
        email: asString(u.email).toLowerCase(),
        name: asString(u.name),
        passwordHash: asString(u.passwordHash, ''),
        repatriationGoalThb: asNullableNumber(u.repatriationGoalThb),
      },
    });
  }

  for (const a of accounts) {
    await prisma.account.upsert({
      where: { id: asString(a.id) },
      create: {
        id: asString(a.id),
        userId: asString(a.userId),
        name: asString(a.name),
        kind: asString(a.kind),
        createdAt: a.createdAt ? asDate(a.createdAt) : undefined,
        updatedAt: a.updatedAt ? asDate(a.updatedAt) : undefined,
      },
      update: {
        userId: asString(a.userId),
        name: asString(a.name),
        kind: asString(a.kind),
      },
    });
  }

  for (const t of transfers) {
    await prisma.fxTransfer.upsert({
      where: { id: asString(t.id) },
      create: {
        id: asString(t.id),
        userId: asString(t.userId),
        accountId: asNullableString(t.accountId),
        date: asDate(t.date),
        direction: asString(t.direction),
        thbAmount: asNumber(t.thbAmount),
        usdAmount: asNumber(t.usdAmount),
        rate: asNumber(t.rate),
        feeThb: asNumber(t.feeThb, 0),
        feeUsd: asNumber(t.feeUsd, 0),
        note: asString(t.note, ''),
        createdAt: t.createdAt ? asDate(t.createdAt) : undefined,
      },
      update: {
        userId: asString(t.userId),
        accountId: asNullableString(t.accountId),
        date: asDate(t.date),
        direction: asString(t.direction),
        thbAmount: asNumber(t.thbAmount),
        usdAmount: asNumber(t.usdAmount),
        rate: asNumber(t.rate),
        feeThb: asNumber(t.feeThb, 0),
        feeUsd: asNumber(t.feeUsd, 0),
        note: asString(t.note, ''),
      },
    });
  }

  for (const t of trades) {
    await prisma.trade.upsert({
      where: { id: asString(t.id) },
      create: {
        id: asString(t.id),
        userId: asString(t.userId),
        accountId: asNullableString(t.accountId),
        date: asDate(t.date),
        ticker: asString(t.ticker),
        market: asString(t.market, 'foreign'),
        side: asString(t.side),
        shares: asNumber(t.shares),
        priceUsd: asNumber(t.priceUsd),
        feeUsd: asNumber(t.feeUsd, 0),
        note: asString(t.note, ''),
        createdAt: t.createdAt ? asDate(t.createdAt) : undefined,
      },
      update: {
        userId: asString(t.userId),
        accountId: asNullableString(t.accountId),
        date: asDate(t.date),
        ticker: asString(t.ticker),
        market: asString(t.market, 'foreign'),
        side: asString(t.side),
        shares: asNumber(t.shares),
        priceUsd: asNumber(t.priceUsd),
        feeUsd: asNumber(t.feeUsd, 0),
        note: asString(t.note, ''),
      },
    });
  }

  for (const d of dividends) {
    await prisma.dividend.upsert({
      where: { id: asString(d.id) },
      create: {
        id: asString(d.id),
        userId: asString(d.userId),
        accountId: asNullableString(d.accountId),
        date: asDate(d.date),
        ticker: asString(d.ticker),
        market: asString(d.market, 'foreign'),
        shares: asNumber(d.shares, 0),
        grossUsd: asNumber(d.grossUsd),
        taxUsd: asNumber(d.taxUsd, 0),
        netUsd: asNumber(d.netUsd),
        note: asString(d.note, ''),
        createdAt: d.createdAt ? asDate(d.createdAt) : undefined,
      },
      update: {
        userId: asString(d.userId),
        accountId: asNullableString(d.accountId),
        date: asDate(d.date),
        ticker: asString(d.ticker),
        market: asString(d.market, 'foreign'),
        shares: asNumber(d.shares, 0),
        grossUsd: asNumber(d.grossUsd),
        taxUsd: asNumber(d.taxUsd, 0),
        netUsd: asNumber(d.netUsd),
        note: asString(d.note, ''),
      },
    });
  }

  for (const c of cashEntries) {
    await prisma.cashEntry.upsert({
      where: { id: asString(c.id) },
      create: {
        id: asString(c.id),
        userId: asString(c.userId),
        accountId: asString(c.accountId),
        date: asDate(c.date),
        direction: asString(c.direction),
        amount: asNumber(c.amount),
        note: asString(c.note, ''),
        createdAt: c.createdAt ? asDate(c.createdAt) : undefined,
        updatedAt: c.updatedAt ? asDate(c.updatedAt) : undefined,
      },
      update: {
        userId: asString(c.userId),
        accountId: asString(c.accountId),
        date: asDate(c.date),
        direction: asString(c.direction),
        amount: asNumber(c.amount),
        note: asString(c.note, ''),
      },
    });
  }

  for (const s of snapshots) {
    await prisma.portfolioSnapshot.upsert({
      where: { id: asString(s.id) },
      create: {
        id: asString(s.id),
        userId: asString(s.userId),
        date: asDate(s.date),
        cashUsd: asNumber(s.cashUsd),
        cashThb: asNumber(s.cashThb),
        marketValueUsd: asNullableNumber(s.marketValueUsd),
        marketValueThb: asNullableNumber(s.marketValueThb),
        holdingsCostUsd: asNumber(s.holdingsCostUsd),
        holdingsCostThb: asNumber(s.holdingsCostThb),
        thbNetAbroad: asNumber(s.thbNetAbroad),
        totalUsdApprox: asNullableNumber(s.totalUsdApprox),
        createdAt: s.createdAt ? asDate(s.createdAt) : undefined,
      },
      update: {
        userId: asString(s.userId),
        date: asDate(s.date),
        cashUsd: asNumber(s.cashUsd),
        cashThb: asNumber(s.cashThb),
        marketValueUsd: asNullableNumber(s.marketValueUsd),
        marketValueThb: asNullableNumber(s.marketValueThb),
        holdingsCostUsd: asNumber(s.holdingsCostUsd),
        holdingsCostThb: asNumber(s.holdingsCostThb),
        thbNetAbroad: asNumber(s.thbNetAbroad),
        totalUsdApprox: asNullableNumber(s.totalUsdApprox),
      },
    });
  }

  await prisma.$disconnect();
  sqlite.close();
  console.log('Migration complete. Keep SQLITE_PATH backup until you verify the app.');
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
