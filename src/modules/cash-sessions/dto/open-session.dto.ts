import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsUUID, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class OpenSessionDto {
  @ApiProperty({ description: 'ID de la caisse', example: 'uuid-de-la-caisse' })
  @IsUUID()
  registerId: string;

  @ApiProperty({
    description: "Montant d'ouverture (fond de caisse)",
    example: 50000,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingAmount: number;

  @ApiPropertyOptional({
    description: 'Notes',
    example: 'Ouverture équipe matin',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
