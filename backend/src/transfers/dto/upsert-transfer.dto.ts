import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class UpsertTransferDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;

  @IsIn(['out', 'in'])
  direction!: 'out' | 'in';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  thbAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  usdAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.000001)
  rate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  feeThb?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  feeUsd?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
