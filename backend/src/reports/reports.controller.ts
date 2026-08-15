import { Controller, Get, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: { userId: string },
    @Query('period') period?: string,
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    return this.reports.summary(user.userId, {
      period: period === 'month' ? 'month' : 'year',
      year: year ? Number(year) : undefined,
      month: month ? Number(month) : undefined,
    });
  }
}
