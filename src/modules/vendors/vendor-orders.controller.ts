import { Controller, Get, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('vendor-orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('vendor-orders')
export class VendorOrdersController {
  @Get()
  @ApiOperation({ summary: 'Liste des commandes vendeurs' })
  findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
  ) {
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Détail d\'une commande vendeur' })
  findOne(@Param('id') id: string) {
    return { id, orderNumber: 'VORD-000', status: 'pending', items: [] };
  }
}
