import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShopProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  shortDescription?: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  price: number;

  @ApiPropertyOptional()
  compareAtPrice?: number;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  unit: string;

  @ApiPropertyOptional()
  brand?: string;

  @ApiProperty({ type: [String] })
  images: string[];

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiProperty()
  categoryId: string;

  @ApiProperty()
  categoryName: string;

  @ApiProperty()
  categorySlug: string;

  @ApiPropertyOptional()
  averageRating?: number;

  @ApiProperty()
  inStock: boolean;
}
