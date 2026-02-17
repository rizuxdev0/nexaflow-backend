import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VariantResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  productId: string;

  @ApiProperty()
  sku: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  size?: string;

  @ApiPropertyOptional()
  color?: string;

  @ApiPropertyOptional()
  material?: string;

  @ApiPropertyOptional()
  weight?: number;

  @ApiProperty()
  priceModifier: number;

  @ApiProperty()
  price: number; // Prix calculé = produit.price + priceModifier

  @ApiProperty()
  stock: number;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
