import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsUUID,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ description: 'Nom du rôle', example: 'store_manager' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Label affiché',
    example: 'Gestionnaire de magasin',
  })
  @IsString()
  @IsNotEmpty()
  label: string;

  @ApiPropertyOptional({
    description: 'Description',
    example: 'Gère le magasin et le stock',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'IDs des permissions', type: [String] })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  permissionIds?: string[];
}
