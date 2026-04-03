import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsEnum, IsUUID, Min, Max, IsDateString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { BatchStatus } from '../entities/batch.entity';

export class CreateBatchDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  batchNumber: string;

  @IsArray()
  @IsOptional()
  serialNumbers?: string[];

  @IsNumber()
  @Min(1)
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  costPrice: number;

  @IsUUID()
  @IsNotEmpty()
  warehouseId: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  manufacturingDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expirationDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  receivedDate?: Date;

  @IsUUID()
  @IsOptional()
  supplierId?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateBatchStatusDto {
  @IsEnum(BatchStatus)
  status: BatchStatus;

  @IsString()
  @IsOptional()
  reason?: string;
}

export class ConsumeBatchDto {
  @IsNumber()
  @Min(1)
  quantity: number;
}

export class SplitBatchDto {
  @IsNumber()
  @Min(1)
  splitQuantity: number;

  @IsUUID()
  @IsNotEmpty()
  targetWarehouseId: string;
}

export class TransferBatchDto {
  @IsUUID()
  @IsNotEmpty()
  targetWarehouseId: string;
}

export class QualityCheckDto {
  @IsEnum(['pass', 'fail', 'conditional'])
  result: 'pass' | 'fail' | 'conditional';

  @IsString()
  @IsNotEmpty()
  inspectorName: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
