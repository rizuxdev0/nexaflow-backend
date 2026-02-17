import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AuditAction } from '../entities/audit-log.entity';

export class AuditResponseDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  userId?: string;

  @ApiProperty()
  userName: string;

  @ApiProperty({ enum: AuditAction })
  action: AuditAction;

  @ApiProperty()
  resource: string;

  @ApiPropertyOptional()
  resourceId?: string;

  @ApiProperty()
  details: string;

  @ApiPropertyOptional()
  oldData?: any;

  @ApiPropertyOptional()
  newData?: any;

  @ApiPropertyOptional()
  ipAddress?: string;

  @ApiProperty()
  timestamp: Date;
}
