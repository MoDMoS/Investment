import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { computeDashboard } from './calc';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get(userId: string) {
    const [transfers, trades, dividends] = await Promise.all([
      this.prisma.fxTransfer.findMany({ where: { userId } }),
      this.prisma.trade.findMany({ where: { userId } }),
      this.prisma.dividend.findMany({ where: { userId } }),
    ]);
    return computeDashboard(transfers, trades, dividends);
  }
}
