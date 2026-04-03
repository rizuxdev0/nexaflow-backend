import { IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreConfigDto {
  @ApiPropertyOptional() @IsOptional() @IsObject() identity?: any;
  @ApiPropertyOptional() @IsOptional() @IsObject() checkout?: any;
  @ApiPropertyOptional() @IsOptional() @IsObject() content?: any;
  @ApiPropertyOptional() @IsOptional() @IsArray() partners?: any[];
  @ApiPropertyOptional() @IsOptional() @IsArray() features?: any[];
  @ApiPropertyOptional() @IsOptional() @IsObject() appearance?: any;
}
