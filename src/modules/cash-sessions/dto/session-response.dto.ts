import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SessionResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  registerId: string;

  @ApiProperty()
  registerName: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  userName?: string;

  @ApiProperty({ enum: ['open', 'closed', 'suspended'] })
  status: string;

  @ApiProperty()
  openingAmount: number;

  @ApiPropertyOptional()
  closingAmount?: number;

  @ApiPropertyOptional()
  expectedAmount?: number;

  @ApiPropertyOptional()
  difference?: number;

  @ApiProperty()
  salesCount: number;

  @ApiProperty()
  salesTotal: number;

  @ApiProperty()
  cashIn: number;

  @ApiProperty()
  cashOut: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  openedAt: Date;

  @ApiPropertyOptional()
  closedAt?: Date;

  @ApiProperty()
  payments: {
    method: string;
    count: number;
    total: number;
  }[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
