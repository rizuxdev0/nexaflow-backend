import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, Min, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CloseSessionDto {
  @ApiProperty({
    description: 'Montant de clôture (argent comptant dans la caisse)',
    example: 125000,
  })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  closingAmount: number;

  @ApiPropertyOptional({
    description: 'Notes sur la clôture',
    example: 'Fermeture équipe soir',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
