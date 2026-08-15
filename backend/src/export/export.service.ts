import { BadRequestException, Injectable } from '@nestjs/common';
import { parseDateOnly, toDateOnly } from '../fx';
import { AccountsService } from '../accounts/accounts.service';
import { PrismaService } from '../prisma/prisma.service';

type ImportPayload = {
  accounts?: { id?: string; name: string; kind: string }[];
  transfers?: Record<string, unknown>[];
  trades?: Record<string, unknown>[];
  dividends?: Record<string, unknown>[];
  cashEntries?: Record<string, unknown>[];
};

@Injectable()
export class ExportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async get(userId: string) {
    await this.accounts.ensureDefaults(userId);
    const [accounts, transfers, trades, dividends, cashEntries] =
      await Promise.all([
        this.prisma.account.findMany({
          where: { userId },
          orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
        }),
        this.prisma.fxTransfer.findMany({
          where: { userId },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.trade.findMany({
          where: { userId },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.dividend.findMany({
          where: { userId },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        }),
        this.prisma.cashEntry.findMany({
          where: { userId },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        }),
      ]);

    return {
      exportedAt: new Date().toISOString(),
      accounts: accounts.map((row) => ({
        id: row.id,
        name: row.name,
        kind: row.kind,
      })),
      transfers: transfers.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        date: toDateOnly(row.date),
        direction: row.direction,
        thbAmount: row.thbAmount,
        usdAmount: row.usdAmount,
        rate: row.rate,
        feeThb: row.feeThb,
        feeUsd: row.feeUsd,
        note: row.note,
      })),
      trades: trades.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        date: toDateOnly(row.date),
        ticker: row.ticker,
        market: row.market,
        side: row.side,
        shares: row.shares,
        priceUsd: row.priceUsd,
        feeUsd: row.feeUsd,
        note: row.note,
      })),
      dividends: dividends.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        date: toDateOnly(row.date),
        ticker: row.ticker,
        market: row.market,
        shares: row.shares,
        grossUsd: row.grossUsd,
        taxUsd: row.taxUsd,
        netUsd: row.netUsd,
        note: row.note,
      })),
      cashEntries: cashEntries.map((row) => ({
        id: row.id,
        accountId: row.accountId,
        date: toDateOnly(row.date),
        direction: row.direction,
        amount: row.amount,
        note: row.note,
      })),
    };
  }

  async importData(userId: string, payload: ImportPayload) {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('ไฟล์นำเข้าไม่ถูกต้อง');
    }

    await this.accounts.ensureDefaults(userId);
    const idMap = new Map<string, string>();

    const existingAccounts = await this.prisma.account.findMany({
      where: { userId },
    });
    for (const row of existingAccounts) {
      idMap.set(row.id, row.id);
    }

    let accountsUpserted = 0;
    for (const row of payload.accounts ?? []) {
      const kind = row.kind === 'th' ? 'th' : 'foreign';
      const name = String(row.name ?? '').trim();
      if (!name) continue;
      const byName = existingAccounts.find(
        (acc) => acc.name === name && acc.kind === kind,
      );
      if (byName) {
        if (row.id) idMap.set(String(row.id), byName.id);
        continue;
      }
      const created = await this.prisma.account.create({
        data: {
          userId,
          name,
          kind,
          ...(row.id && !idMap.has(String(row.id))
            ? { id: String(row.id) }
            : {}),
        },
      });
      existingAccounts.push(created);
      if (row.id) idMap.set(String(row.id), created.id);
      idMap.set(created.id, created.id);
      accountsUpserted += 1;
    }

    const resolveAccountId = (raw: unknown) => {
      if (raw == null || raw === '') return null;
      const key = String(raw);
      return idMap.get(key) ?? (existingAccounts.some((a) => a.id === key) ? key : null);
    };

    let transfers = 0;
    for (const row of payload.transfers ?? []) {
      const date = String(row.date ?? '');
      const direction = row.direction === 'in' ? 'in' : 'out';
      if (!date) continue;
      const data = {
        userId,
        accountId: resolveAccountId(row.accountId),
        date: parseDateOnly(date),
        direction,
        thbAmount: num(row.thbAmount),
        usdAmount: num(row.usdAmount),
        rate: num(row.rate),
        feeThb: num(row.feeThb),
        feeUsd: num(row.feeUsd),
        note: String(row.note ?? ''),
      };
      const id = row.id ? String(row.id) : null;
      if (id) {
        const owned = await this.prisma.fxTransfer.findFirst({
          where: { id, userId },
        });
        if (owned) {
          await this.prisma.fxTransfer.update({ where: { id }, data });
        } else {
          await this.prisma.fxTransfer.create({ data: { id, ...data } });
        }
      } else {
        await this.prisma.fxTransfer.create({ data });
      }
      transfers += 1;
    }

    let trades = 0;
    for (const row of payload.trades ?? []) {
      const date = String(row.date ?? '');
      const ticker = String(row.ticker ?? '').trim().toUpperCase();
      if (!date || !ticker) continue;
      const data = {
        userId,
        accountId: resolveAccountId(row.accountId),
        date: parseDateOnly(date),
        ticker,
        market: row.market === 'th' ? 'th' : 'foreign',
        side: row.side === 'sell' ? 'sell' : 'buy',
        shares: num(row.shares),
        priceUsd: num(row.priceUsd),
        feeUsd: num(row.feeUsd),
        note: String(row.note ?? ''),
      };
      const id = row.id ? String(row.id) : null;
      if (id) {
        const owned = await this.prisma.trade.findFirst({ where: { id, userId } });
        if (owned) {
          await this.prisma.trade.update({ where: { id }, data });
        } else {
          await this.prisma.trade.create({ data: { id, ...data } });
        }
      } else {
        await this.prisma.trade.create({ data });
      }
      trades += 1;
    }

    let dividends = 0;
    for (const row of payload.dividends ?? []) {
      const date = String(row.date ?? '');
      const ticker = String(row.ticker ?? '').trim().toUpperCase();
      if (!date || !ticker) continue;
      const grossUsd = num(row.grossUsd);
      const taxUsd = num(row.taxUsd);
      const netUsd =
        row.netUsd != null ? num(row.netUsd) : Math.max(grossUsd - taxUsd, 0);
      const data = {
        userId,
        accountId: resolveAccountId(row.accountId),
        date: parseDateOnly(date),
        ticker,
        market: row.market === 'th' ? 'th' : 'foreign',
        shares: num(row.shares),
        grossUsd,
        taxUsd,
        netUsd,
        note: String(row.note ?? ''),
      };
      const id = row.id ? String(row.id) : null;
      if (id) {
        const owned = await this.prisma.dividend.findFirst({
          where: { id, userId },
        });
        if (owned) {
          await this.prisma.dividend.update({ where: { id }, data });
        } else {
          await this.prisma.dividend.create({ data: { id, ...data } });
        }
      } else {
        await this.prisma.dividend.create({ data });
      }
      dividends += 1;
    }

    let cashEntries = 0;
    for (const row of payload.cashEntries ?? []) {
      const date = String(row.date ?? '');
      const accountId = resolveAccountId(row.accountId);
      if (!date || !accountId) continue;
      const data = {
        userId,
        accountId,
        date: parseDateOnly(date),
        direction: row.direction === 'out' ? 'out' : 'in',
        amount: num(row.amount),
        note: String(row.note ?? ''),
      };
      const id = row.id ? String(row.id) : null;
      if (id) {
        const owned = await this.prisma.cashEntry.findFirst({
          where: { id, userId },
        });
        if (owned) {
          await this.prisma.cashEntry.update({ where: { id }, data });
        } else {
          await this.prisma.cashEntry.create({ data: { id, ...data } });
        }
      } else {
        await this.prisma.cashEntry.create({ data });
      }
      cashEntries += 1;
    }

    return {
      ok: true,
      accountsUpserted,
      transfers,
      trades,
      dividends,
      cashEntries,
    };
  }
}

function num(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
