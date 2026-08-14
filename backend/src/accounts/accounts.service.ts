import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { computeAccountCash } from '../dashboard/calc';
import { parseDateOnly, toDateOnly } from '../fx';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  UpsertCashEntryDto,
} from './dto/account.dto';

const DEFAULTS = [
  { name: 'หุ้นไทย', kind: 'th' as const },
  { name: 'หุ้นนอก', kind: 'foreign' as const },
];

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureDefaults(userId: string) {
    const existing = await this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    const created = [...existing];
    for (const def of DEFAULTS) {
      if (!created.some((row) => row.kind === def.kind)) {
        created.push(
          await this.prisma.account.create({
            data: { userId, name: def.name, kind: def.kind },
          }),
        );
      }
    }

    const thai = created.find((row) => row.kind === 'th');
    const foreign = created.find((row) => row.kind === 'foreign');
    if (!thai || !foreign) {
      throw new BadRequestException('สร้างบัญชีเริ่มต้นไม่สำเร็จ');
    }

    await Promise.all([
      this.prisma.trade.updateMany({
        where: { userId, accountId: null, market: 'th' },
        data: { accountId: thai.id },
      }),
      this.prisma.trade.updateMany({
        where: { userId, accountId: null, NOT: { market: 'th' } },
        data: { accountId: foreign.id },
      }),
      this.prisma.dividend.updateMany({
        where: { userId, accountId: null },
        data: { accountId: foreign.id },
      }),
      this.prisma.fxTransfer.updateMany({
        where: { userId, accountId: null },
        data: { accountId: foreign.id },
      }),
    ]);

    return this.prisma.account.findMany({
      where: { userId },
      orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async list(userId: string) {
    const accounts = await this.ensureDefaults(userId);
    const [transfers, trades, dividends, cashEntries] = await Promise.all([
      this.prisma.fxTransfer.findMany({ where: { userId } }),
      this.prisma.trade.findMany({ where: { userId } }),
      this.prisma.dividend.findMany({ where: { userId } }),
      this.prisma.cashEntry.findMany({
        where: { userId },
        include: { account: { select: { kind: true } } },
      }),
    ]);
    const cash = computeAccountCash(
      accounts,
      transfers,
      trades,
      dividends,
      cashEntries.map((row) => ({
        accountId: row.accountId,
        direction: row.direction,
        amount: row.amount,
        kind: row.account.kind === 'th' ? 'th' : 'foreign',
      })),
    );
    const cashById = new Map(cash.map((row) => [row.accountId, row.cash]));
    return accounts.map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind === 'th' ? 'th' : 'foreign',
      cash: cashById.get(row.id) ?? 0,
    }));
  }

  async create(userId: string, dto: CreateAccountDto) {
    await this.ensureDefaults(userId);
    const row = await this.prisma.account.create({
      data: {
        userId,
        name: dto.name.trim(),
        kind: dto.kind,
      },
    });
    return { id: row.id, name: row.name, kind: row.kind, cash: 0 };
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.ensureOwnedAccount(userId, id);
    const row = await this.prisma.account.update({
      where: { id },
      data: { name: dto.name.trim() },
    });
    return { id: row.id, name: row.name, kind: row.kind };
  }

  async remove(userId: string, id: string) {
    const account = await this.ensureOwnedAccount(userId, id);
    const [trades, transfers, dividends, cashEntries, sameKind] =
      await Promise.all([
        this.prisma.trade.count({ where: { accountId: id } }),
        this.prisma.fxTransfer.count({ where: { accountId: id } }),
        this.prisma.dividend.count({ where: { accountId: id } }),
        this.prisma.cashEntry.count({ where: { accountId: id } }),
        this.prisma.account.count({ where: { userId, kind: account.kind } }),
      ]);
    if (sameKind <= 1) {
      throw new BadRequestException('ต้องเหลือบัญชีประเภทนี้ไว้อย่างน้อย 1 บัญชี');
    }
    if (trades + transfers + dividends + cashEntries > 0) {
      throw new BadRequestException('ลบไม่ได้ เพราะบัญชียังมีรายการอยู่');
    }
    await this.prisma.account.delete({ where: { id } });
    return { ok: true };
  }

  async resolve(userId: string, accountId: string | undefined, kind: 'th' | 'foreign') {
    const accounts = await this.ensureDefaults(userId);
    if (accountId) {
      const row = accounts.find((item) => item.id === accountId);
      if (!row) {
        throw new NotFoundException('ไม่พบบัญชี');
      }
      if ((row.kind === 'th' ? 'th' : 'foreign') !== kind) {
        throw new BadRequestException(
          kind === 'th' ? 'บัญชีนี้เป็นหุ้นนอก' : 'บัญชีนี้เป็นหุ้นไทย',
        );
      }
      return row;
    }
    const fallback = accounts.find((item) => item.kind === kind);
    if (!fallback) {
      throw new BadRequestException('ไม่พบบัญชีเริ่มต้น');
    }
    return fallback;
  }

  async listCash(userId: string, accountId?: string) {
    await this.ensureDefaults(userId);
    const rows = await this.prisma.cashEntry.findMany({
      where: { userId, ...(accountId ? { accountId } : {}) },
      include: { account: { select: { name: true, kind: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(serializeCash);
  }

  async createCash(userId: string, dto: UpsertCashEntryDto) {
    if (!(dto.amount > 0)) {
      throw new BadRequestException('จำนวนต้องมากกว่า 0');
    }
    const accountId = dto.accountId;
    if (!accountId) {
      throw new BadRequestException('ต้องระบุบัญชี');
    }
    await this.ensureOwnedAccount(userId, accountId);
    const row = await this.prisma.cashEntry.create({
      data: {
        userId,
        accountId,
        date: parseDateOnly(dto.date),
        direction: dto.direction,
        amount: dto.amount,
        note: dto.note?.trim() ?? '',
      },
      include: { account: { select: { name: true, kind: true } } },
    });
    return serializeCash(row);
  }

  async updateCash(userId: string, id: string, dto: UpsertCashEntryDto) {
    if (!(dto.amount > 0)) {
      throw new BadRequestException('จำนวนต้องมากกว่า 0');
    }
    const existing = await this.prisma.cashEntry.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('ไม่พบรายการเงินโบรก');
    }
    const accountId = dto.accountId ?? existing.accountId;
    await this.ensureOwnedAccount(userId, accountId);
    const row = await this.prisma.cashEntry.update({
      where: { id },
      data: {
        accountId,
        date: parseDateOnly(dto.date),
        direction: dto.direction,
        amount: dto.amount,
        note: dto.note?.trim() ?? '',
      },
      include: { account: { select: { name: true, kind: true } } },
    });
    return serializeCash(row);
  }

  async removeCash(userId: string, id: string) {
    const existing = await this.prisma.cashEntry.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException('ไม่พบรายการเงินโบรก');
    }
    await this.prisma.cashEntry.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureOwnedAccount(userId: string, id: string) {
    const row = await this.prisma.account.findFirst({ where: { id, userId } });
    if (!row) {
      throw new NotFoundException('ไม่พบบัญชี');
    }
    return row;
  }
}

function serializeCash(row: {
  id: string;
  accountId: string;
  date: Date;
  direction: string;
  amount: number;
  note: string;
  account: { name: string; kind: string };
}) {
  return {
    id: row.id,
    accountId: row.accountId,
    accountName: row.account.name,
    kind: row.account.kind === 'th' ? 'th' : 'foreign',
    date: toDateOnly(row.date),
    direction: row.direction,
    amount: row.amount,
    note: row.note,
  };
}
