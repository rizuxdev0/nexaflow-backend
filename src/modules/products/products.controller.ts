import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { Product } from './entities/product.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { VariantsService } from './variants.service';
import { VariantResponseDto } from './dto/variant-response.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@ApiTags('products')
@Controller('products')
@ApiBearerAuth()
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly variantsService: VariantsService,
  ) {}

  // ============ ENDPOINTS POUR PRODUITS ============
  @Post()
  @ApiOperation({ summary: 'Créer un nouveau produit' })
  @ApiResponse({ status: 201, description: 'Produit créé avec succès' })
  @ApiResponse({ status: 409, description: 'SKU ou slug déjà existant' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createProductDto: CreateProductDto): Promise<Product> {
    return this.productsService.create(createProductDto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée des produits' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'supplierId', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'inStock', required: false, type: Boolean })
  @ApiQuery({ name: 'isFeatured', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Liste des produits' })
  findAll(
    @Query() paginationDto: PaginationDto,
    @Query('categoryId') categoryId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('inStock') inStock?: boolean,
    @Query('isFeatured') isFeatured?: boolean,
  ): Promise<PaginatedResponse<Product>> {
    return this.productsService.findAll(
      paginationDto.page,
      paginationDto.pageSize,
      paginationDto.search,
      categoryId,
      supplierId,
      undefined, // isActive
      isFeatured,
      minPrice,
      maxPrice,
      inStock,
    );
  }

  @Get('featured')
  @ApiOperation({ summary: 'Produits en vedette' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des produits en vedette' })
  getFeatured(@Query('limit') limit?: number): Promise<Product[]> {
    return this.productsService.getFeaturedProducts(limit || 10);
  }

  @Get('low-stock')
  @ApiOperation({ summary: 'Produits avec stock faible' })
  @ApiQuery({ name: 'threshold', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Liste des produits en stock faible',
  })
  getLowStock(@Query('threshold') threshold?: number): Promise<Product[]> {
    return this.productsService.getLowStockProducts(threshold);
  }

  @Get('out-of-stock')
  @ApiOperation({ summary: 'Produits en rupture de stock' })
  @ApiResponse({ status: 200, description: 'Liste des produits en rupture' })
  getOutOfStock(): Promise<Product[]> {
    return this.productsService.getOutOfStockProducts();
  }

  @Get('category/:categoryId')
  @ApiOperation({ summary: 'Produits par catégorie' })
  @ApiParam({ name: 'categoryId', description: 'ID de la catégorie' })
  @ApiResponse({
    status: 200,
    description: 'Liste des produits de la catégorie',
  })
  getByCategory(@Param('categoryId') categoryId: string): Promise<Product[]> {
    return this.productsService.getProductsByCategory(categoryId);
  }

  @Get('supplier/:supplierId')
  @ApiOperation({ summary: 'Produits par fournisseur' })
  @ApiParam({ name: 'supplierId', description: 'ID du fournisseur' })
  @ApiResponse({
    status: 200,
    description: 'Liste des produits du fournisseur',
  })
  getBySupplier(@Param('supplierId') supplierId: string): Promise<Product[]> {
    return this.productsService.getProductsBySupplier(supplierId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Rechercher des produits' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Résultats de la recherche' })
  search(@Query('q') query: string): Promise<Product[]> {
    return this.productsService.searchProducts(query);
  }

  @Get('sku/:sku')
  @ApiOperation({ summary: "Détail d'un produit par SKU" })
  @ApiParam({ name: 'sku', description: 'SKU du produit' })
  @ApiResponse({ status: 200, description: 'Produit trouvé' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  findBySku(@Param('sku') sku: string): Promise<Product> {
    return this.productsService.findBySku(sku);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: "Détail d'un produit par slug" })
  @ApiParam({ name: 'slug', description: 'Slug du produit' })
  @ApiResponse({ status: 200, description: 'Produit trouvé' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  findBySlug(@Param('slug') slug: string): Promise<Product> {
    return this.productsService.findBySlug(slug);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un produit" })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({ status: 200, description: 'Produit trouvé' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  findOne(@Param('id') id: string): Promise<Product> {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un produit' })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({ status: 200, description: 'Produit modifié' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  @ApiResponse({ status: 409, description: 'SKU déjà existant' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    return this.productsService.update(id, updateProductDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un produit' })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({ status: 204, description: 'Produit supprimé' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.productsService.remove(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activer/Désactiver un produit' })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({ status: 200, description: 'Statut modifié' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  toggleStatus(@Param('id') id: string): Promise<Product> {
    return this.productsService.toggleStatus(id);
  }

  @Patch(':id/featured')
  @ApiOperation({ summary: 'Mettre/Enlever en vedette' })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({ status: 200, description: 'Statut vedette modifié' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  toggleFeatured(@Param('id') id: string): Promise<Product> {
    return this.productsService.toggleFeatured(id);
  }

  @Patch(':id/stock')
  @ApiOperation({ summary: 'Modifier le stock' })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({ status: 200, description: 'Stock modifié' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  @ApiResponse({ status: 400, description: 'Stock insuffisant' })
  updateStock(
    @Param('id') id: string,
    @Body() updateStockDto: UpdateStockDto,
  ): Promise<Product> {
    return this.productsService.updateStock(id, updateStockDto);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Dupliquer un produit' })
  @ApiParam({ name: 'id', description: 'ID du produit à dupliquer' })
  @ApiResponse({ status: 201, description: 'Produit dupliqué' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  @HttpCode(HttpStatus.CREATED)
  duplicate(@Param('id') id: string): Promise<Product> {
    return this.productsService.duplicateProduct(id);
  }

  // ============ ENDPOINTS POUR VARIANTES ============

  @Get(':id/variants')
  @Permissions('products.read')
  @ApiOperation({ summary: "Liste des variantes d'un produit" })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({ status: 200, description: 'Liste des variantes' })
  async findVariants(@Param('id') id: string): Promise<VariantResponseDto[]> {
    return this.variantsService.findAll(id);
  }

  @Post(':id/variants')
  @Permissions('products.create')
  @ApiOperation({ summary: 'Ajouter une variante à un produit' })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiResponse({ status: 201, description: 'Variante créée' })
  @ApiResponse({ status: 409, description: 'SKU déjà existant' })
  @HttpCode(HttpStatus.CREATED)
  async createVariant(
    @Param('id') id: string,
    @Body() createVariantDto: CreateVariantDto,
  ): Promise<VariantResponseDto> {
    const variant = await this.variantsService.create(id, createVariantDto);
    const product = await this.productsService.findOne(id);
    return this.variantsService['mapToResponseDto'](variant, product.price);
  }

  @Get(':id/variants/:variantId')
  @Permissions('products.read')
  @ApiOperation({ summary: "Détail d'une variante" })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiParam({ name: 'variantId', description: 'ID de la variante' })
  @ApiResponse({ status: 200, description: 'Variante trouvée' })
  @ApiResponse({ status: 404, description: 'Variante non trouvée' })
  async findOneVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ): Promise<VariantResponseDto> {
    const variant = await this.variantsService.findOne(variantId);
    const product = await this.productsService.findOne(id);
    return this.variantsService['mapToResponseDto'](variant, product.price);
  }

  @Put(':id/variants/:variantId')
  @Permissions('products.update')
  @ApiOperation({ summary: 'Modifier une variante' })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiParam({ name: 'variantId', description: 'ID de la variante' })
  @ApiResponse({ status: 200, description: 'Variante modifiée' })
  @ApiResponse({ status: 404, description: 'Variante non trouvée' })
  @ApiResponse({ status: 409, description: 'SKU déjà existant' })
  async updateVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() updateVariantDto: UpdateVariantDto,
  ): Promise<VariantResponseDto> {
    const variant = await this.variantsService.update(
      id,
      variantId,
      updateVariantDto,
    );
    const product = await this.productsService.findOne(id);
    return this.variantsService['mapToResponseDto'](variant, product.price);
  }

  @Delete(':id/variants/:variantId')
  @Permissions('products.delete')
  @ApiOperation({ summary: 'Supprimer une variante' })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiParam({ name: 'variantId', description: 'ID de la variante' })
  @ApiResponse({ status: 204, description: 'Variante supprimée' })
  @ApiResponse({ status: 404, description: 'Variante non trouvée' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeVariant(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
  ): Promise<void> {
    return this.variantsService.remove(id, variantId);
  }

  @Patch(':id/variants/:variantId/stock')
  @Permissions('products.update')
  @ApiOperation({ summary: "Mettre à jour le stock d'une variante" })
  @ApiParam({ name: 'id', description: 'ID du produit' })
  @ApiParam({ name: 'variantId', description: 'ID de la variante' })
  @ApiResponse({ status: 200, description: 'Stock mis à jour' })
  async updateVariantStock(
    @Param('id') id: string,
    @Param('variantId') variantId: string,
    @Body() updateStockDto: UpdateStockDto,
  ): Promise<VariantResponseDto> {
    const variant = await this.variantsService.updateStock(
      variantId,
      updateStockDto.quantity,
    );
    const product = await this.productsService.findOne(id);
    return this.variantsService['mapToResponseDto'](variant, product.price);
  }
}
