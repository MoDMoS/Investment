import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { DividendsController } from './dividends.controller';
import { DividendsService } from './dividends.service';

@Module({
  imports: [AccountsModule],
  controllers: [DividendsController],
  providers: [DividendsService],
})
export class DividendsModule {}
