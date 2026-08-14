import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';

@Module({
  imports: [AccountsModule],
  controllers: [TradesController],
  providers: [TradesService],
})
export class TradesModule {}
