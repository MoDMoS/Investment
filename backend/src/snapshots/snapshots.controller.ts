import { Controller, Get, Inject, Post, Query, forwardRef } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { DashboardService } from '../dashboard/dashboard.service';
import { SnapshotsService } from './snapshots.service';

@Controller('snapshots')
export class SnapshotsController {
  constructor(
    private readonly snapshots: SnapshotsService,
    @Inject(forwardRef(() => DashboardService))
    private readonly dashboard: DashboardService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: string,
  ) {
    return this.snapshots.list(user.userId, limit ? Number(limit) : 365);
  }

  @Post()
  async capture(@CurrentUser() user: { userId: string }) {
    const summary = await this.dashboard.get(user.userId);
    return this.snapshots.upsertToday(user.userId, {
      cashUsd: summary.cashUsd,
      cashThb: summary.cashThb,
      marketValueUsd: summary.marketValueUsd,
      marketValueThb: summary.marketValueThb,
      holdingsCostUsd: summary.holdingsCostUsd,
      holdingsCostThb: summary.holdingsCostThb,
      thbNetAbroad: summary.thbNetAbroad,
    });
  }
}
