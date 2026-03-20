import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales-overview')
  @Permissions('reports.read')
  getSalesOverview(
    @Query('startDate') startDate?: Date, 
    @Query('endDate') endDate?: Date
  ) {
    return this.reportsService.getSalesOverview(startDate, endDate);
  }

  @Get('top-products')
  @Permissions('reports.read')
  getTopProducts(@Query('limit') limit?: number) {
    return this.reportsService.getTopProducts(limit);
  }

  @Get('customer-intelligence')
  @Permissions('reports.read')
  getCustomerIntelligence() {
    return this.reportsService.getCustomerIntelligence();
  }

  @Get('inventory-analytics')
  @Permissions('reports.read')
  getInventoryAnalytics() {
    return this.reportsService.getInventoryAnalytics();
  }
}
