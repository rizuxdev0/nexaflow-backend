import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('vendor-products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('vendor-products')
export class VendorProductsController {
  @Get()
  @ApiOperation({ summary: 'Liste des produits vendeurs' })
  findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return {
      data: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  @Patch(':id/review')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Approuver/Rejeter un produit vendeur' })
  reviewProduct(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes?: string,
  ) {
    return { success: true, id, status, notes };
  }
}
