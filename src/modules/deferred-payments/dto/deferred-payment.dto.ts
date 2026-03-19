import { IsString, IsNotEmpty, IsNumber, IsOptional, IsArray, IsDateString } from 'class-validator';

export class CreateDeferredPaymentDto {
  @IsString() @IsNotEmpty() orderId: string;
  @IsString() @IsNotEmpty() orderNumber: string;
  @IsString() @IsNotEmpty() customerId: string;
  @IsString() @IsNotEmpty() customerName: string;
  @IsNumber() @IsNotEmpty() totalAmount: number;
  @IsDateString() @IsNotEmpty() dueDate: string;
  @IsArray() @IsOptional() installments?: any[];
  @IsString() @IsOptional() notes?: string;
}

export class RecordPaymentEntryDto {
  @IsNumber() @IsNotEmpty() amount: number;
  @IsString() @IsNotEmpty() method: string;
  @IsDateString() @IsNotEmpty() paidAt: string;
  @IsString() @IsNotEmpty() receivedBy: string;
  @IsArray() @IsOptional() installmentIds?: string[];
}

export class ExtendDueDateDto {
  @IsDateString() @IsNotEmpty() newDueDate: string;
  @IsString() @IsOptional() installmentId?: string;
}

export class OverdueActionDto {
  @IsString() @IsOptional() action?: string; // e.g. 'notify'
}
