import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private readonly exporter: ExportService) {}

  @Get()
  get(@CurrentUser() user: { userId: string }) {
    return this.exporter.get(user.userId);
  }

  @Post('import')
  import(
    @CurrentUser() user: { userId: string },
    @Body() body: Record<string, unknown>,
  ) {
    return this.exporter.importData(user.userId, body);
  }
}
