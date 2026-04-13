import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@Controller('dashboard')
@UseInterceptors(CacheInterceptor)
@CacheTTL(600) // 10 minutes pour le dashboard
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
