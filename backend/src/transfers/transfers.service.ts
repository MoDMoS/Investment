import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { parseDateOnly, resolveFxAmounts, toDateOnly } from '../fx';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertTransferDto } from './dto/upsert-transfer.dto';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
  ) {}

  async list(userId: string) {
    await this.accounts.ensureDefaults(userId);
    const rows = await this.prisma.fxTransfer.findMany({
      where: { userId },
      include: { account: { select: { name: true } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(serializeTransfer);
  }

  async create(userId: string, dto: UpsertTransferDto) {
    const account = await this.accounts.resolve(userId, dto.accountId, 'foreign');
    const amounts = resolveFxAmounts(dto);
    const row = await this.prisma.fxTransfer.create({
      data: {
        userId,
        accountId: account.id,
        date: parseDateOnly(dto.date),
        direction: dto.direction,
        ...amounts,
        feeThb: dto.feeThb ?? 0,
        feeUsd: dto.feeUsd ?? 0,
        note: dto.note?.trim() ?? '',
      },
      include: { account: { select: { name: true } } },
    });
    return serializeTransfer(row);
  }

  async update(userId: string, id: string, dto: UpsertTransferDto) {
    await this.ensureOwned(userId, id);
    const account = await this.accounts.resolve(userId, dto.accountId, 'foreign');
    const amounts = resolveFxAmounts(dto);
    const row = await this.prisma.fxTransfer.update({
      where: { id },
      data: {
        accountId: account.id,
        date: parseDateOnly(dto.date),
        direction: dto.direction,
        ...amounts,
        feeThb: dto.feeThb ?? 0,
        feeUsd: dto.feeUsd ?? 0,
        note: dto.note?.trim() ?? '',
      },
      include: { account: { select: { name: true } } },
    });
    return serializeTransfer(row);
  }

  async remove(userId: string, id: string) {
    await this.ensureOwned(userId, id);
    await this.prisma.fxTransfer.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureOwned(userId: string, id: string) {
    const row = await this.prisma.fxTransfer.findFirst({
      where: { id, userId },
    });
    if (!row) {
      throw new NotFoundException('ไม่พบรายการแลกเงิน');
    }
  }
}

function serializeTransfer(row: {
  id: string;
  accountId: string | null;
  account?: { name: string } | null;
  date: Date;
  direction: string;
  thbAmount: number;
  usdAmount: number;
  rate: number;
  feeThb: number;
  feeUsd: number;
  note: string;
}) {
  return {
    id: row.id,
    accountId: row.accountId,
    accountName: row.account?.name ?? '',
    date: toDateOnly(row.date),
    direction: row.direction,
    thbAmount: row.thbAmount,
    usdAmount: row.usdAmount,
    rate: row.rate,
    feeThb: row.feeThb,
    feeUsd: row.feeUsd,
    note: row.note,
  };
}
