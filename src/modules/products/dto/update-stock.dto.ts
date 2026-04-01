import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export enum StockOperation {
  SET = 'set',
  ADD = 'add',
  REMOVE = 'remove',
}

export class UpdateStockDto {
  @ApiProperty({ description: 'Opération à effectuer', enum: StockOperation })
  @IsEnum(StockOperation)
  operation: StockOperation;

  @ApiProperty({ description: 'Quantité', example: 10 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ description: 'Raison du mouvement', example: 'Réajustement inventaire', required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ description: 'Autoriser le stock négatif', default: false, required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  allowNegative?: boolean;
}
