import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CommissionService } from './commission.service';

@ApiTags('commission-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('commission-rules')
export class CommissionRulesController {
  constructor(private readonly commissionService: CommissionService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des règles de commission' })
  findAll() {
    return this.commissionService.findAllRules();
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Créer une règle de commission' })
  create(@Body() data: any) {
    return this.commissionService.createRule(data);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Modifier une règle de commission' })
  update(@Param('id') id: string, @Body() data: any) {
    return this.commissionService.updateRule(id, data);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Supprimer une règle de commission' })
  remove(@Param('id') id: string) {
    return this.commissionService.removeRule(id);
  }
}
