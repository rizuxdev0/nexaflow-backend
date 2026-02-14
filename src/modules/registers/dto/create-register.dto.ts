import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateRegisterDto {
  @ApiProperty({
    description: 'Nom de la caisse',
    example: 'Caisse Principale',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value?.trim() : value))
  name: string;

  @ApiProperty({
    description: 'Code unique de la caisse',
    example: 'CAISSE001',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) =>
    typeof value === 'string' ? value?.trim().toUpperCase() : value,
  )
  code: string;

  @ApiProperty({ description: 'Emplacement', example: 'Comptoir principal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  location: string;

  @ApiPropertyOptional({ description: 'Caisse principale', default: false })
  @IsBoolean()
  @IsOptional()
  isMain?: boolean;

  @ApiPropertyOptional({ description: "ID de l'utilisateur assigné" })
  @IsUUID()
  @IsOptional()
  assignedUserId?: string;
}
