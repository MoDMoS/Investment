import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ExportService } from './export.service';

@Controller('export')
export class ExportController {
  constructor(private readonly exporter: ExportService) {}

  @Get()
  get(@CurrentUser() user: { userId: string }) {
    return this.exporter.get(user.userId);
  }
}
