import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('commission-rules')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('commission-rules')
export class CommissionRulesController {
  @Get()
  @ApiOperation({ summary: 'Liste des règles de commission' })
  findAll() {
    return [
      { id: 'global-def', name: 'Règle globale par défaut', type: 'global', rate: 15, isActive: true, priority: 0 }
    ];
  }

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Créer une règle de commission' })
  create(@Body() data: any) {
    return { success: true, ...data, id: 'rule-' + Date.now() };
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Modifier une règle de commission' })
  update(@Param('id') id: string, @Body() data: any) {
    return { success: true, id, ...data };
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Supprimer une règle de commission' })
  remove(@Param('id') id: string) {
    return { success: true, id };
  }
}
