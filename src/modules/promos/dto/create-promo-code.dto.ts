import { IsString, IsNotEmpty, IsNumber, IsOptional, IsBoolean, IsIn, IsDateString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePromoCodeDto {
  @ApiProperty() @IsString() @IsNotEmpty() code: string;
  @ApiProperty() @IsString() @IsNotEmpty() description: string;
  @ApiProperty() @IsString() @IsIn(['percentage', 'fixed']) type: string;
  @ApiProperty() @IsNumber() value: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() minOrderAmount?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() maxDiscountAmount?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() usageLimit?: number;
  @ApiPropertyOptional() @IsDateString() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() endDate?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
  @ApiPropertyOptional() @IsArray() @IsOptional() applicableProducts?: string[];
  @ApiPropertyOptional() @IsArray() @IsOptional() applicableCategories?: string[];
}
