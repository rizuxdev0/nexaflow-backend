import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsUUID, IsArray, Min } from 'class-validator';
import { ReturnStatus, ReturnReason, ReturnItem } from '../entities/return.entity';

export class CreateReturnDto {
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsArray()
  @IsNotEmpty()
  items: ReturnItem[];

  @IsEnum(ReturnReason)
  reason: ReturnReason;

  @IsString()
  @IsOptional()
  reasonDetails?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateReturnStatusDto {
  @IsEnum(ReturnStatus)
  status: ReturnStatus;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  refundAmount?: number;

  @IsString()
  @IsOptional()
  refundMethod?: string;
}
