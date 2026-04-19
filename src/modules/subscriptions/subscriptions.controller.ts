import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Req } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { Public } from 'src/common/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Public()
  @Get('plans')
  @ApiOperation({ summary: 'Récupérer les plans d\'abonnement actifs' })
  findAllActive() {
    return this.service.findAll(true);
  }

  @ApiBearerAuth()
  @Get('admin/plans')
  @ApiOperation({ summary: 'Récupérer tous les plans (admin)' })
  findAll() {
    return this.service.findAll(false);
  }

  @ApiBearerAuth()
  @Post('admin/plans')
  @ApiOperation({ summary: 'Créer un nouveau plan' })
  create(@Body() data: any) {
    return this.service.create(data);
  }

  @ApiBearerAuth()
  @Patch('admin/plans/:id')
  @ApiOperation({ summary: 'Modifier un plan' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.service.update(id, data);
  }

  @ApiBearerAuth()
  @Delete('admin/plans/:id')
  @ApiOperation({ summary: 'Supprimer un plan' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @ApiBearerAuth()
  @Post('seed')
  @ApiOperation({ summary: 'Initialiser les plans par défaut' })
  seed() {
    return this.service.seed();
  }

  @ApiBearerAuth()
  @Post('subscribe/:planId')
  @ApiOperation({ summary: 'Souscrire à un plan' })
  subscribe(@Param('planId') planId: string, @Req() req: any) {
    return this.service.subscribe(req.user.id, planId);
  }
}
