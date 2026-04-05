import { IsOptional, IsEnum, IsString, IsUUID } from 'class-validator';
import { OrderStatus, PaymentStatus } from '../entities/order.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class OrderFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(OrderStatus)
  declare status?: OrderStatus;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsUUID()
  declare customerId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;
}
