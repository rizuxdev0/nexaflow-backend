import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID, IsDateString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction } from '../entities/audit-log.entity';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class AuditFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: AuditAction })
  @IsEnum(AuditAction)
  @IsOptional()
  action?: AuditAction;

  @ApiPropertyOptional({ description: 'Allowed to exceed standard pagination limit for CSV exports.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  // @Max(50000)
  pageSize?: number = 20;

  @ApiPropertyOptional()
  @IsOptional()
  resource?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
