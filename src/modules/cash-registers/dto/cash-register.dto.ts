import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { CashMovementType } from '../entities/cash-movement.entity';

export class OpenCashRegisterDto {
  @IsNumber()
  @IsNotEmpty()
  openingBalance: number;
}

export class CreateCashMovementDto {
  @IsEnum(CashMovementType)
  @IsNotEmpty()
  type: CashMovementType;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsUUID()
  @IsOptional()
  orderId?: string;
}

export class CreateCashRegisterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  branchId: string;
}
