import { IsString, IsNotEmpty, IsArray, IsOptional, IsNumber } from 'class-validator';

export class CreateReturnDto {
  @IsString() @IsNotEmpty() orderId: string;
  @IsString() @IsNotEmpty() orderNumber: string;
  @IsString() @IsNotEmpty() customerId: string;
  @IsString() @IsNotEmpty() customerName: string;
  @IsArray() @IsNotEmpty() items: any[];
  @IsString() @IsNotEmpty() reason: string;
  @IsString() @IsOptional() reasonDetails?: string;
  @IsNumber() @IsOptional() refundAmount?: number;
  @IsString() @IsOptional() notes?: string;
}

export class UpdateReturnStatusDto {
  @IsString() @IsNotEmpty() status: string; // 'approved' | 'rejected' | 'refunded' | 'exchanged'
  @IsString() @IsOptional() processedBy?: string;
}
