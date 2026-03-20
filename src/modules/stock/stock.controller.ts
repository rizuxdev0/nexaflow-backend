import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('stock')
@ApiBearerAuth()
@Controller('stock')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get('movements')
  @Permissions('stock.read')
  findAll(@Query() query: any) {
    return this.stockService.getMovements(query.productId, query.page, query.pageSize);
  }

  @Get('chart')
  @Permissions('stock.read')
  getChart(@Query('days') days?: number) {
    return this.stockService.getMovementsChartData(days);
  }
}
