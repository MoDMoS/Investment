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

export class UpsertTradeDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @MinLength(1)
  ticker!: string;

  @IsIn(['buy', 'sell'])
  side!: 'buy' | 'sell';

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  shares!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  priceUsd!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  feeUsd?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
