import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AccountsService } from './accounts.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  UpsertCashEntryDto,
} from './dto/account.dto';

@Controller()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get('accounts')
  list(@CurrentUser() user: { userId: string }) {
    return this.accounts.list(user.userId);
  }

  @Post('accounts')
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateAccountDto,
  ) {
    return this.accounts.create(user.userId, dto);
  }

  @Patch('accounts/:id')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accounts.update(user.userId, id, dto);
  }

  @Delete('accounts/:id')
  remove(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.accounts.remove(user.userId, id);
  }

  @Get('cash-entries')
  listCash(
    @CurrentUser() user: { userId: string },
    @Query('accountId') accountId?: string,
  ) {
    return this.accounts.listCash(user.userId, accountId);
  }

  @Post('cash-entries')
  createCash(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpsertCashEntryDto,
  ) {
    return this.accounts.createCash(user.userId, dto);
  }

  @Patch('cash-entries/:id')
  updateCash(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpsertCashEntryDto,
  ) {
    return this.accounts.updateCash(user.userId, id, dto);
  }

  @Delete('cash-entries/:id')
  removeCash(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
  ) {
    return this.accounts.removeCash(user.userId, id);
  }
}
