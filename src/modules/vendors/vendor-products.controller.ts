import { Controller, Get, Body, Patch, Param, Post, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ProductsService } from '../products/products.service';

@ApiTags('vendor-products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Controller('vendor-products')
export class VendorProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Liste des produits vendeurs' })
  findAll(
    @Query('page') page: number = 1,
    @Query('pageSize') pageSize: number = 20,
    @Query('vendorId') vendorId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.productsService.findAll(
      Number(page),
      Number(pageSize),
      search,
      undefined, // categoryId
      undefined, // supplierId
      true, // isActive
      undefined, // isFeatured
      undefined, // minPrice
      undefined, // maxPrice
      undefined, // inStock
      vendorId,
      status,
    );
  }

  @Patch(':id/review')
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Approuver/Rejeter un produit vendeur' })
  reviewProduct(
    @Param('id') id: string,
    @Body('status') status: 'APPROVED' | 'REJECTED' | 'PENDING',
    @Body('notes') notes?: string,
  ) {
    return this.productsService.reviewVendorProduct(id, status, notes);
  }

  @Post()
  @ApiOperation({ summary: 'Soumettre un nouveau produit' })
  async create(@Request() req: any, @Body() data: any) {
    const vendor = await this.productsService['productsRepository'].manager
      .getRepository('Vendor')
      .findOne({ where: { userId: req.user.id } });
    
    if (!vendor) {
      throw new Error('Profil vendeur non trouvé');
    }

    return this.productsService.create({
      ...data,
      vendorId: vendor.id,
      approvalStatus: 'PENDING',
      isActive: false, // Wait for approval
    });
  }
}
