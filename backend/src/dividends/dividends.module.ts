import { Module } from '@nestjs/common';
import { DividendsController } from './dividends.controller';
import { DividendsService } from './dividends.service';

@Module({
  controllers: [DividendsController],
  providers: [DividendsService],
})
export class DividendsModule {}
