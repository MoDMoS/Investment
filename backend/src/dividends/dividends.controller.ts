import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpsertDividendDto } from './dto/upsert-dividend.dto';
import { DividendsService } from './dividends.service';

@Controller('dividends')
export class DividendsController {
  constructor(private readonly dividends: DividendsService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.dividends.list(user.userId);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpsertDividendDto,
  ) {
    return this.dividends.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpsertDividendDto,
  ) {
    return this.dividends.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.dividends.remove(user.userId, id);
  }
}
