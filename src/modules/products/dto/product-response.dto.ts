import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class CategoryInfoDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  slug: string;
}

class SupplierInfoDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  code: string;
  @ApiProperty()
  contactName: string;
}

class VariantInfoDto {
  @ApiProperty()
  id: string;
  @ApiProperty()
  name: string;
  @ApiProperty()
  sku: string;
  @ApiProperty()
  price: number;
  @ApiProperty()
  stock: number;
  @ApiPropertyOptional()
  color?: string;
  @ApiPropertyOptional()
  size?: string;
}

export class ProductResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  shortDescription?: string;

  @ApiProperty()
  sku: string;

  @ApiPropertyOptional()
  barcode?: string;

  @ApiProperty()
  category: CategoryInfoDto;

  @ApiPropertyOptional()
  supplier?: SupplierInfoDto;

  @ApiProperty()
  price: number;

  @ApiProperty()
  costPrice: number;

  @ApiPropertyOptional()
  compareAtPrice?: number;

  @ApiProperty()
  taxRate: number;

  @ApiProperty()
  stock: number;

  @ApiProperty()
  minStock: number;

  @ApiProperty()
  maxStock: number;

  @ApiProperty()
  unit: string;

  @ApiProperty()
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';

  @ApiPropertyOptional()
  weight?: number;

  @ApiPropertyOptional()
  weightUnit?: string;

  @ApiPropertyOptional()
  dimensions?: any;

  @ApiPropertyOptional()
  brand?: string;

  @ApiProperty()
  images: string[];

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  isFeatured: boolean;

  @ApiPropertyOptional()
  tags?: string[];

  @ApiPropertyOptional({ type: [VariantInfoDto] })
  variants?: VariantInfoDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
