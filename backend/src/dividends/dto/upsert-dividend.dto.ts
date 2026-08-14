import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class UpsertDividendDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsString()
  @MinLength(1)
  ticker!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shares?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  grossUsd!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxUsd?: number;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
