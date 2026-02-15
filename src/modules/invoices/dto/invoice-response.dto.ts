import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../entities/invoice.entity';

class InvoiceItemDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  productName: string;

  @ApiProperty()
  productSku: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  totalPrice: number;

  @ApiProperty()
  taxRate: number;

  @ApiProperty()
  taxAmount: number;
}

export class InvoiceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  invoiceNumber: string;

  @ApiProperty()
  orderId: string;

  @ApiProperty()
  orderNumber: string;

  @ApiPropertyOptional()
  customerId?: string;

  @ApiProperty()
  customerName: string;

  @ApiPropertyOptional()
  customerEmail?: string;

  @ApiPropertyOptional()
  customerAddress?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  items: InvoiceItemDto[];

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  taxTotal: number;

  @ApiProperty()
  discountTotal: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ enum: InvoiceStatus })
  status: InvoiceStatus;

  @ApiProperty()
  issuedAt: Date;

  @ApiProperty()
  dueDate: Date;

  @ApiPropertyOptional()
  paidAt?: Date;

  @ApiPropertyOptional()
  notes?: string;

  @ApiPropertyOptional()
  paymentMethod?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
