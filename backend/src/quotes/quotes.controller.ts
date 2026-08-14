import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { QuotesService } from './quotes.service';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get('usdthb')
  usdthb(@CurrentUser() _user: { userId: string }) {
    return this.quotes.getUsdThb();
  }
}
