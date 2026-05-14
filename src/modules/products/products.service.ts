import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, Between } from 'typeorm';
import { Product } from './entities/product.entity';
import { ProductVariant } from './entities/product-variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateStockDto, StockOperation } from './dto/update-stock.dto';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';
import { CategoriesService } from '../categories/categories.service';
import { SuppliersService } from '../suppliers/suppliers.service';
import { StockService } from '../stock/stock.service';
import { StockMovementType } from '../stock/entities/stock-movement.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';
import * as slugify from 'slugify';

type ProductWithStockStatus = Product & { stockStatus: string };

@Injectable()
export class ProductsService extends AbstractTenantService<Product> {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantsRepository: Repository<ProductVariant>,
    private categoriesService: CategoriesService,
    private suppliersService: SuppliersService,
    private stockService: StockService,
    private auditService: AuditService,
    tenantService: TenantService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(productsRepository, tenantService, 'Product');
  }

  private generateSlug(name: string): string {
    return slugify.default(name, {
      lower: true,
      strict: true,
      locale: 'fr',
      trim: true,
    });
  }

  private getStockStatus(product: Product): string {
    if (product.stock <= 0) return 'out_of_stock';
    if (product.stock <= product.minStock) return 'low_stock';
    return 'in_stock';
  }

  async create(createProductDto: CreateProductDto): Promise<Product> {
    if (!createProductDto.sku || createProductDto.sku === 'undefined') {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      createProductDto.sku = `PRD-${Date.now().toString().slice(-4)}${randomPart}`;
    }

    const existingSku = await this.repo.findOne({
      where: { sku: createProductDto.sku },
    });

    if (existingSku) {
      throw new ConflictException(`Un produit avec le SKU "${createProductDto.sku}" existe déjà`);
    }

    const category = await this.categoriesService.findOne(createProductDto.categoryId);
    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID "${createProductDto.categoryId}" non trouvée`);
    }

    if (createProductDto.supplierId) {
      const supplier = await this.suppliersService.findOne(createProductDto.supplierId);
      if (!supplier) {
        throw new NotFoundException(`Fournisseur avec l'ID "${createProductDto.supplierId}" non trouvé`);
      }
    }

    const slug = this.generateSlug(createProductDto.name);
    const existingSlug = await this.repo.findOne({ where: { slug } });

    if (existingSlug) {
      throw new ConflictException(`Un produit avec le slug "${slug}" existe déjà`);
    }

    const product = this.repo.create({
      ...createProductDto,
      slug,
      vendorId: this.tenantService.getVendorId() || undefined,
      images: createProductDto.images || [],
      tags: createProductDto.tags || [],
    });

    const savedProduct = await this.repo.save(product);

    if (savedProduct.stock > 0) {
      await this.stockService.createMovement({
        productId: savedProduct.id,
        type: StockMovementType.IN,
        quantity: savedProduct.stock,
        reason: 'Stock initial à la création du produit',
      });
    }

    await this.auditService.log({
      userName: 'Système',
      action: AuditAction.CREATE,
      resource: 'Product',
      resourceId: savedProduct.id,
      details: `Création du produit ${savedProduct.name} (${savedProduct.sku})`,
      newData: savedProduct,
    });

    await (this.cacheManager as any).clear();
    return savedProduct;
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    categoryId?: string,
    supplierId?: string,
    isActive?: boolean,
    isFeatured?: boolean,
    minPrice?: number,
    maxPrice?: number,
    inStock?: boolean,
    vendorId?: string,
    approvalStatus?: string,
  ): Promise<PaginatedResponse<ProductWithStockStatus>> {
    const where: FindOptionsWhere<Product> = {};

    if (search) where.name = Like(`%${search}%`);
    if (categoryId) where.categoryId = categoryId;
    if (supplierId) where.supplierId = supplierId;
    if (approvalStatus) where.approvalStatus = approvalStatus as any;
    if (isActive !== undefined) where.isActive = isActive;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = Between(minPrice || 0, maxPrice || 999999999);
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['category', 'supplier', 'variants'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    let filteredData = data;
    if (inStock !== undefined) {
      filteredData = data.filter((product) =>
        inStock ? product.stock > 0 : product.stock <= 0,
      );
    }

    const dataWithStatus: ProductWithStockStatus[] = filteredData.map((product) => ({
      ...product,
      stockStatus: this.getStockStatus(product),
    }));

    return PaginatedResponseBuilder.build(
      dataWithStatus,
      inStock !== undefined ? filteredData.length : total,
      page,
      pageSize,
    );
  }

  async findOne(id: string): Promise<Product> {
    return super.findOne(id, ['category', 'supplier', 'variants']);
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.repo.findOne({
      where: { slug },
      relations: ['category', 'supplier', 'variants'],
    });
    if (!product) throw new NotFoundException(`Produit avec le slug "${slug}" non trouvé`);
    return product;
  }

  async findBySku(sku: string): Promise<Product> {
    const product = await this.repo.findOne({
      where: { sku },
      relations: ['category', 'supplier', 'variants'],
    });
    if (!product) throw new NotFoundException(`Produit avec le SKU "${sku}" non trouvé`);
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.repo.findOne({ where: { sku: updateProductDto.sku } });
      if (existingSku && existingSku.id !== id) {
        throw new ConflictException(`Un produit avec le SKU "${updateProductDto.sku}" existe déjà`);
      }
    }

    if (updateProductDto.categoryId && updateProductDto.categoryId !== product.categoryId) {
      await this.categoriesService.findOne(updateProductDto.categoryId);
    }

    if (updateProductDto.supplierId && updateProductDto.supplierId !== product.supplierId) {
      await this.suppliersService.findOne(updateProductDto.supplierId);
    }

    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const newSlug = this.generateSlug(updateProductDto.name);
      const existingSlug = await this.repo.findOne({ where: { slug: newSlug } });
      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(`Un produit avec le slug "${newSlug}" existe déjà`);
      }
      product.slug = newSlug;
    }

    const oldData = { ...product };
    Object.assign(product, updateProductDto);
    const updatedProduct = await this.repo.save(product);

    await this.auditService.log({
      userName: 'Système',
      action: AuditAction.UPDATE,
      resource: 'Product',
      resourceId: updatedProduct.id,
      details: `Modification du produit ${updatedProduct.name} (${updatedProduct.sku})`,
      oldData,
      newData: updatedProduct,
    });

    await (this.cacheManager as any).clear();
    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    if (product.variants?.length > 0) {
      await this.variantsRepository.remove(product.variants);
    }

    const productId = product.id;
    const productName = product.name;
    const productSku = product.sku;

    try {
      await this.repo.remove(product);
      await this.auditService.log({
        userName: 'Système',
        action: AuditAction.DELETE,
        resource: 'Product',
        resourceId: productId,
        details: `Suppression du produit ${productName} (${productSku})`,
      });
    } catch (error) {
      if (error.message?.includes('foreign key') || error.message?.includes('violates foreign')) {
        product.isActive = false;
        product.sku = `${product.sku || 'DEL'}-${Date.now().toString().slice(-6)}`;
        product.slug = `${product.slug}-${Date.now()}`;
        await this.repo.save(product);
        await this.auditService.log({
          userName: 'Système',
          action: AuditAction.UPDATE,
          resource: 'Product',
          resourceId: productId,
          details: `Archivage automatique suite à contrainte pour: ${productName}`,
        });
      } else {
        throw error;
      }
    }
    await (this.cacheManager as any).clear();
  }

  async toggleStatus(id: string): Promise<Product> {
    const product = await this.findOne(id);
    product.isActive = !product.isActive;
    const saved = await this.repo.save(product);
    await (this.cacheManager as any).clear();
    return saved;
  }

  async toggleFeatured(id: string): Promise<Product> {
    const product = await this.findOne(id);
    product.isFeatured = !product.isFeatured;
    const saved = await this.repo.save(product);
    await (this.cacheManager as any).clear();
    return saved;
  }

  async updateStock(id: string, updateStockDto: UpdateStockDto, userId?: string): Promise<Product> {
    const product = await this.findOne(id);
    let movementType: StockMovementType;
    let quantity = updateStockDto.quantity;

    if (updateStockDto.operation === StockOperation.SET) {
      const diff = updateStockDto.quantity - product.stock;
      if (diff === 0) return product;
      movementType = diff > 0 ? StockMovementType.IN : StockMovementType.OUT;
      quantity = Math.abs(diff);
    } else {
      movementType = updateStockDto.operation === StockOperation.ADD ? StockMovementType.IN : StockMovementType.OUT;
    }

    await this.stockService.createMovement({
      productId: id,
      type: movementType,
      quantity,
      reason: updateStockDto.reason || 'Mise à jour manuelle',
      userId,
      allowNegative: updateStockDto.allowNegative,
    });

    await (this.cacheManager as any).clear();
    return await this.findOne(id);
  }

  async getLowStockProducts(threshold?: number): Promise<Product[]> {
    const products = await this.repo.find({
      where: { isActive: true },
      relations: ['category', 'supplier'],
    });
    return products.filter(p => p.stock > 0 && p.stock <= (threshold || p.minStock));
  }

  async getOutOfStockProducts(): Promise<Product[]> {
    return await this.repo.find({
      where: { stock: 0, isActive: true },
      relations: ['category', 'supplier'],
    });
  }

  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    return await this.repo.find({
      where: { isFeatured: true, isActive: true },
      relations: ['category'],
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return await this.repo.find({
      where: { categoryId, isActive: true },
      relations: ['category'],
      order: { name: 'ASC' },
    });
  }

  async getProductsBySupplier(supplierId: string): Promise<Product[]> {
    return await this.repo.find({
      where: { supplierId, isActive: true },
      relations: ['supplier'],
      order: { name: 'ASC' },
    });
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await this.repo.find({
      where: [
        { name: Like(`%${query}%`) },
        { description: Like(`%${query}%`) },
        { sku: Like(`%${query}%`) },
      ],
      relations: ['category'],
      take: 20,
    });
  }
 
  async getBestSellers(limit: number = 8): Promise<Product[]> {
    return await this.repo.find({
      where: { isActive: true },
      relations: ['category'],
      order: { salesCount: 'DESC' },
      take: limit,
    });
  }
 
  async getRecommended(productId?: string, limit: number = 4): Promise<Product[]> {
    let categoryId: string | undefined;
    if (productId) {
      const p = await this.repo.findOne({ where: { id: productId } });
      categoryId = p?.categoryId;
    }
 
    let results: Product[] = [];
    if (categoryId) {
      results = await this.repo.find({
        where: { isActive: true, categoryId },
        relations: ['category'],
        order: { salesCount: 'DESC' },
        take: limit * 2,
      });
      results = results.filter(p => p.id !== productId);
    }

    if (results.length < limit) {
      const others = await this.repo.find({
        where: { isActive: true },
        relations: ['category'],
        order: { salesCount: 'DESC' },
        take: limit * 3,
      });
      results = [...results, ...others.filter(p => p.id !== productId && !results.find(r => r.id === p.id))];
    }

    return results.sort(() => Math.random() - 0.5).slice(0, limit);
  }

  async duplicateProduct(id: string): Promise<Product> {
    const product = await this.findOne(id);
    const duplicatedProduct = this.repo.create({
      ...product,
      id: undefined,
      name: `${product.name} (Copy)`,
      sku: `${product.sku}-COPY-${Date.now()}`,
      slug: `${product.slug}-copy-${Date.now()}`,
      stock: 0,
      isActive: false,
    });
    return await this.repo.save(duplicatedProduct);
  }

  async reviewVendorProduct(id: string, status: string, reason?: string): Promise<Product> {
    const product = await this.findOne(id);
    product.approvalStatus = status as any;
    product.rejectionReason = reason ?? null;
    product.isActive = status === 'APPROVED';

    const saved = await this.repo.save(product);
    await this.auditService.log({
      userName: 'Système',
      action: AuditAction.UPDATE,
      resource: 'Product',
      resourceId: saved.id,
      details: `Révision produit: ${status}`,
      newData: saved,
    });
    await (this.cacheManager as any).clear();
    return saved;
  }
}
