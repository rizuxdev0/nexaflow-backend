import { Controller, Get, Query, UseInterceptors, UseGuards } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('dashboard')
@Controller('dashboard')
@UseInterceptors(CacheInterceptor)
@CacheTTL(600) // 10 minutes pour le dashboard
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @Permissions('dashboard.read')
  @ApiOperation({ summary: 'Statistiques générales du dashboard' })
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('sales')
  @Permissions('dashboard.read')
  @ApiOperation({ summary: 'Données de ventes par jour sur N jours' })
  getSalesData(@Query('days') days?: number) {
    return this.dashboardService.getSalesData(days ? Number(days) : 30);
  }

  @Get('top-products')
  @Permissions('dashboard.read')
  @ApiOperation({ summary: 'Produits les plus vendus' })
  getTopProducts(@Query('limit') limit?: number) {
    return this.dashboardService.getTopProducts(limit ? Number(limit) : 5);
  }

  @Get('revenue-by-category')
  @Permissions('dashboard.read')
  @ApiOperation({ summary: 'Revenus par catégorie' })
  getRevenueByCategory() {
    return this.dashboardService.getRevenueByCategory();
  }
}
