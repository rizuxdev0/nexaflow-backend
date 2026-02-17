import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PosOrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  afterDiscount: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  paymentMethod: string;

  @ApiPropertyOptional()
  tenderedAmount?: number;

  @ApiPropertyOptional()
  change?: number;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;
}
