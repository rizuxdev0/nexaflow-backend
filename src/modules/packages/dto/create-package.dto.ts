import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePackageDto {
  @ApiProperty() @IsString() @IsNotEmpty() name: string;
  @ApiProperty() @IsString() @IsNotEmpty() description: string;
  @ApiProperty() @IsArray() items: any[];
  @ApiProperty() @IsNumber() originalPrice: number;
  @ApiProperty() @IsNumber() bundlePrice: number;
  @ApiProperty() @IsNumber() savingsPercent: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() stock?: number;
  @ApiPropertyOptional() @IsDateString() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() endDate?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
  @ApiPropertyOptional() @IsString() @IsOptional() image?: string;
}
