import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InvoiceStatus } from '../entities/invoice.entity';

export class UpdateInvoiceStatusDto {
  @ApiProperty({ enum: InvoiceStatus, description: 'Nouveau statut' })
  @IsEnum(InvoiceStatus)
  status: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Notes ou raison du changement' })
  @IsString()
  @IsOptional()
  notes?: string;
}
