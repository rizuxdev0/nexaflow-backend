import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(PermissionsGuard)
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @ApiBearerAuth()
  @Permissions('subscriptions.manage')
  @Get('admin/stats')
  @ApiOperation({ summary: 'Récupérer les statistiques des abonnements (SuperAdmin)' })
  getAdminStats() {
    return this.service.getAdminStats();
  }

  @ApiBearerAuth()
  @Permissions('subscriptions.read')
  @Get('vendor/stats')
  @ApiOperation({ summary: 'Récupérer les statistiques de mon abonnement (Vendeur)' })
  getVendorStats() {
    return this.service.getVendorSubscriptionStats();
  }

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Récupérer les plans d\'abonnement actifs' })
  findAllActive() {
    return this.service.findAll(true);
  }

  @ApiBearerAuth()
  @Permissions('subscriptions.manage')
  @Get('admin/plans')
  @ApiOperation({ summary: 'Récupérer tous les plans (admin)' })
  findAll() {
    return this.service.findAll(false);
  }

  @ApiBearerAuth()
  @Permissions('subscriptions.manage')
  @Post('admin/plans')
  @ApiOperation({ summary: 'Créer un nouveau plan' })
  create(@Body() data: any) {
    return this.service.create(data);
  }

  @ApiBearerAuth()
  @Permissions('subscriptions.manage')
  @Patch('admin/plans/:id')
  @ApiOperation({ summary: 'Modifier un plan' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @ApiBearerAuth()
  @Permissions('subscriptions.manage')
  @Delete('admin/plans/:id')
  @ApiOperation({ summary: 'Supprimer un plan' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @ApiBearerAuth()
  @Permissions('subscriptions.manage')
  @Post('seed')
  @ApiOperation({ summary: 'Initialiser les plans par défaut' })
  seed() {
    return this.service.seed();
  }

  @ApiBearerAuth()
  @Permissions('subscriptions.read')
  @Post('subscribe/:planId')
  @ApiOperation({ summary: 'Souscrire à un plan' })
  subscribe(@Param('planId') planId: string, @Req() req: any) {
    return this.service.subscribe(req.user.id, planId);
  }
}
