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
import { UpsertTransferDto } from './dto/upsert-transfer.dto';
import { TransfersService } from './transfers.service';

@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  list(@CurrentUser() user: { userId: string }) {
    return this.transfers.list(user.userId);
  }

  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpsertTransferDto,
  ) {
    return this.transfers.create(user.userId, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: { userId: string },
    @Param('id') id: string,
    @Body() dto: UpsertTransferDto,
  ) {
    return this.transfers.update(user.userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: { userId: string }, @Param('id') id: string) {
    return this.transfers.remove(user.userId, id);
  }
}
