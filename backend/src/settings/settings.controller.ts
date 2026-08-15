import { Body, Controller, Get, Patch } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Min, ValidateIf } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SettingsService } from './settings.service';

class UpdateSettingsDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  repatriationGoalThb?: number | null;
}

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get(@CurrentUser() user: { userId: string }) {
    return this.settings.get(user.userId);
  }

  @Patch()
  update(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settings.update(user.userId, dto);
  }
}
