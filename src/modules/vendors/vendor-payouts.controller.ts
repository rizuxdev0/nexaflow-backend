import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('vendor-payouts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('vendor-payouts')
export class VendorPayoutsController {
  @Get()
  @ApiOperation({ summary: 'Liste des paiements vendeurs' })
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

  @Post()
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Enregistrer un paiement' })
  create(@Body() data: any) {
    return { success: true, ...data, id: 'PAY-' + Date.now() };
  }

  @Patch(':id/status')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Changer le statut d\'un paiement' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return { success: true, id, status };
  }
}
