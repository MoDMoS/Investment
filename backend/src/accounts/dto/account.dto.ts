import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAccountDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(['th', 'foreign'])
  kind!: 'th' | 'foreign';
}

export class UpdateAccountDto {
  @IsString()
  @MinLength(1)
  name!: string;
}

export class UpsertCashEntryDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsIn(['in', 'out'])
  direction!: 'in' | 'out';

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
