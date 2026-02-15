import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ShopService } from './shop.service';
import { CreateShopOrderDto } from './dto/shop-order.dto';
import { ShopProductResponseDto } from './dto/shop-product-response.dto';
import { ShopOrderResponseDto } from './dto/shop-order-response.dto';
import { Category } from '../categories/entities/category.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@ApiTags('shop')
@Controller('shop')
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  // ============ CATALOGUE PUBLIC ============

  @Get('products')
  @ApiOperation({ summary: 'Catalogue public des produits' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['price_asc', 'price_desc', 'newest'],
  })
  @ApiResponse({ status: 200, description: 'Liste des produits' })
  async getProducts(
    @Query() paginationDto: PaginationDto,
    @Query('categoryId') categoryId?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('sortBy') sortBy?: any,
  ): Promise<PaginatedResponse<ShopProductResponseDto>> {
    return this.shopService.getPublicProducts(
      paginationDto.page,
      paginationDto.pageSize,
      paginationDto.search,
      categoryId,
      minPrice,
      maxPrice,
      true, // inStock seulement
      sortBy,
    );
  }

  @Get('products/featured')
  @ApiOperation({ summary: 'Produits en vedette' })
  @ApiResponse({ status: 200, description: 'Liste des produits vedettes' })
  //   async getFeaturedProducts(): Promise<ShopProductResponseDto[]> {
  //     // À implémenter avec un flag isFeatured
  //     return [];
  //   }
  @Get('products/search')
  @ApiOperation({ summary: 'Recherche de produits' })
  @ApiQuery({ name: 'q', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Résultats de la recherche' })
  async searchProducts(
    @Query('q') query: string,
  ): Promise<ShopProductResponseDto[]> {
    return this.shopService.searchProducts(query);
  }

  @Get('products/category/:categorySlug')
  @ApiOperation({ summary: 'Produits par catégorie' })
  @ApiParam({ name: 'categorySlug', description: 'Slug de la catégorie' })
  @ApiResponse({ status: 200, description: 'Produits de la catégorie' })
  async getProductsByCategory(
    @Param('categorySlug') categorySlug: string,
  ): Promise<ShopProductResponseDto[]> {
    return this.shopService.getProductsByCategory(categorySlug);
  }

  @Get('products/:id')
  @ApiOperation({ summary: "Détail d'un produit" })
  @ApiParam({ name: 'id', description: 'ID ou slug du produit' })
  @ApiResponse({ status: 200, description: 'Produit trouvé' })
  @ApiResponse({ status: 404, description: 'Produit non trouvé' })
  async getProduct(@Param('id') id: string): Promise<ShopProductResponseDto> {
    return this.shopService.getPublicProduct(id);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Liste des catégories actives' })
  @ApiResponse({ status: 200, description: 'Liste des catégories' })
  async getCategories(): Promise<Category[]> {
    return this.shopService.getPublicCategories();
  }

  // ============ COMMANDES E-COMMERCE ============

  @Post('orders')
  @ApiOperation({ summary: 'Passer une commande' })
  @ApiResponse({ status: 201, description: 'Commande créée avec succès' })
  @ApiResponse({ status: 400, description: 'Erreur de validation' })
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() createOrderDto: CreateShopOrderDto,
  ): Promise<ShopOrderResponseDto> {
    return this.shopService.createShopOrder(createOrderDto);
  }

  @Get('orders/:orderNumber')
  @ApiOperation({ summary: 'Suivre une commande' })
  @ApiParam({ name: 'orderNumber', description: 'Numéro de commande' })
  @ApiResponse({ status: 200, description: 'Commande trouvée' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  async getOrder(
    @Param('orderNumber') orderNumber: string,
  ): Promise<ShopOrderResponseDto> {
    return this.shopService.getOrderByNumber(orderNumber);
  }

  @Get('customers/:customerId/orders')
  @ApiOperation({ summary: "Commandes d'un client" })
  @ApiParam({ name: 'customerId', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Liste des commandes' })
  async getCustomerOrders(
    @Param('customerId') customerId: string,
  ): Promise<ShopOrderResponseDto[]> {
    return this.shopService.getCustomerOrders(customerId);
  }

  // ============ UTILITAIRES ============

  @Get('stock/check/:productId')
  @ApiOperation({ summary: "Vérifier le stock d'un produit" })
  @ApiParam({ name: 'productId', description: 'ID du produit' })
  @ApiQuery({ name: 'quantity', required: true, type: Number })
  @ApiResponse({ status: 200, description: 'Résultat de la vérification' })
  async checkStock(
    @Param('productId') productId: string,
    @Query('quantity') quantity: number,
  ): Promise<{ available: boolean; stock: number }> {
    const available = await this.shopService.checkStock(productId, quantity);
    return { available, stock: 0 }; // À améliorer
  }
}
