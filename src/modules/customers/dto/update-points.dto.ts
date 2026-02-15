import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export enum PointsOperation {
  ADD = 'add',
  REMOVE = 'remove',
  SET = 'set',
}

export class UpdatePointsDto {
  @ApiProperty({
    enum: PointsOperation,
    description: 'Opération sur les points',
  })
  @IsEnum(PointsOperation)
  operation: PointsOperation;

  @ApiProperty({ description: 'Nombre de points', example: 100 })
  @IsNumber()
  @Type(() => Number)
  points: number;
}
