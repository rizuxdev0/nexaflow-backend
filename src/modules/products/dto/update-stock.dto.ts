import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min, IsEnum } from 'class-validator';
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
}
