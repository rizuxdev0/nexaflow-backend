import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsNumber, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBannerDto {
  @ApiProperty() @IsString() @IsNotEmpty() title: string;
  @ApiPropertyOptional() @IsString() @IsOptional() subtitle?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaText?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() ctaLink?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() image?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() bgColor?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() textColor?: string;
  @ApiProperty() @IsString() @IsIn(['hero', 'catalogue_top', 'catalogue_side', 'home_middle', 'home_bottom']) position: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() isActive?: boolean;
  @ApiPropertyOptional() @IsDateString() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsDateString() @IsOptional() endDate?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() priority?: number;
}
