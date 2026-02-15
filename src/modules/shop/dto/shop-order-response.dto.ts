import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ShopOrderItemResponseDto {
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
}

export class ShopOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  customerName: string;

  @ApiPropertyOptional()
  customerEmail?: string;

  @ApiPropertyOptional()
  shippingAddress?: string;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  taxTotal: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  paymentMethod: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  paymentStatus: string;

  @ApiProperty({ type: [ShopOrderItemResponseDto] })
  items: ShopOrderItemResponseDto[];

  @ApiProperty()
  orderDate: Date;

  @ApiPropertyOptional()
  invoiceId?: string;
}
