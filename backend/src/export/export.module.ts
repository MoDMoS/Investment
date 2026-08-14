import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

@Module({
  imports: [AccountsModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
