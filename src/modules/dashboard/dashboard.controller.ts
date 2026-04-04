import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques générales du dashboard' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('sales')
  @ApiOperation({ summary: 'Données de ventes par jour sur N jours' })
  getSalesData(@Query('days') days?: number) {
    return this.dashboardService.getSalesData(days ? Number(days) : 30);
  }

  @Get('top-products')
  @ApiOperation({ summary: 'Produits les plus vendus' })
  getTopProducts(@Query('limit') limit?: number) {
    return this.dashboardService.getTopProducts(limit ? Number(limit) : 5);
  }

  @Get('revenue-by-category')
  @ApiOperation({ summary: 'Revenus par catégorie' })
  getRevenueByCategory() {
    return this.dashboardService.getRevenueByCategory();
  }
}
