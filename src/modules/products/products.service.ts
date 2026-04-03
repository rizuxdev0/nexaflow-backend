import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
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
import * as slugify from 'slugify';

// Type pour les produits avec statut de stock
type ProductWithStockStatus = Product & { stockStatus: string };

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantsRepository: Repository<ProductVariant>,
    private categoriesService: CategoriesService,
    private suppliersService: SuppliersService,
    private stockService: StockService,
    private auditService: AuditService,
  ) {}

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
    // Générer un SKU s'il n'est pas fourni ou s'il vaut 'undefined'
    if (!createProductDto.sku || createProductDto.sku === 'undefined') {
      const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
      createProductDto.sku = `PRD-${Date.now().toString().slice(-4)}${randomPart}`;
    }

    // Vérifier si le SKU existe déjà
    const existingSku = await this.productsRepository.findOne({
      where: { sku: createProductDto.sku },
    });

    if (existingSku) {
      throw new ConflictException(
        `Un produit avec le SKU "${createProductDto.sku}" existe déjà`,
      );
    }

    // Vérifier si la catégorie existe
    const category = await this.categoriesService.findOne(
      createProductDto.categoryId,
    );
    if (!category) {
      throw new NotFoundException(
        `Catégorie avec l'ID "${createProductDto.categoryId}" non trouvée`,
      );
    }

    // Vérifier si le fournisseur existe (si fourni)
    if (createProductDto.supplierId) {
      const supplier = await this.suppliersService.findOne(
        createProductDto.supplierId,
      );
      if (!supplier) {
        throw new NotFoundException(
          `Fournisseur avec l'ID "${createProductDto.supplierId}" non trouvé`,
        );
      }
    }

    // Générer le slug à partir du nom
    const slug = this.generateSlug(createProductDto.name);

    // Vérifier l'unicité du slug
    const existingSlug = await this.productsRepository.findOne({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException(
        `Un produit avec le slug "${slug}" existe déjà`,
      );
    }

    const product = this.productsRepository.create({
      ...createProductDto,
      slug,
      images: createProductDto.images || [],
      tags: createProductDto.tags || [],
    });

    const savedProduct = await this.productsRepository.save(product);

    // Initialiser le mouvement de stock si stock > 0
    if (savedProduct.stock > 0) {
      await this.stockService.createMovement({
        productId: savedProduct.id,
        type: StockMovementType.IN,
        quantity: savedProduct.stock,
        reason: 'Stock initial à la création du produit',
      });
    }

    // Logger l'audit
    await this.auditService.log({
      userName: 'Système',
      action: AuditAction.CREATE,
      resource: 'Product',
      resourceId: savedProduct.id,
      details: `Création du produit ${savedProduct.name} (${savedProduct.sku})`,
      newData: savedProduct,
    });

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
  ): Promise<PaginatedResponse<ProductWithStockStatus>> {
    const where: FindOptionsWhere<Product> = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = Between(minPrice || 0, maxPrice || 999999999);
    }

    const [data, total] = await this.productsRepository.findAndCount({
      where,
      relations: ['category', 'supplier', 'variants'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    // Filtrer par stock si demandé
    let filteredData = data;
    if (inStock !== undefined) {
      filteredData = data.filter((product) =>
        inStock ? product.stock > 0 : product.stock <= 0,
      );
    }

    // Ajouter le statut de stock
    const dataWithStatus: ProductWithStockStatus[] = filteredData.map(
      (product) => ({
        ...product,
        stockStatus: this.getStockStatus(product),
      }),
    );

    return PaginatedResponseBuilder.build(
      dataWithStatus,
      inStock !== undefined ? filteredData.length : total,
      page,
      pageSize,
    );
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { id },
      relations: ['category', 'supplier', 'variants'],
    });

    if (!product) {
      throw new NotFoundException(`Produit avec l'ID "${id}" non trouvé`);
    }

    return product;
  }

  async findBySlug(slug: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { slug },
      relations: ['category', 'supplier', 'variants'],
    });

    if (!product) {
      throw new NotFoundException(`Produit avec le slug "${slug}" non trouvé`);
    }

    return product;
  }

  async findBySku(sku: string): Promise<Product> {
    const product = await this.productsRepository.findOne({
      where: { sku },
      relations: ['category', 'supplier', 'variants'],
    });

    if (!product) {
      throw new NotFoundException(`Produit avec le SKU "${sku}" non trouvé`);
    }

    return product;
  }

  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<Product> {
    const product = await this.findOne(id);

    // Vérifier l'unicité du SKU si modifié
    if (updateProductDto.sku && updateProductDto.sku !== product.sku) {
      const existingSku = await this.productsRepository.findOne({
        where: { sku: updateProductDto.sku },
      });

      if (existingSku && existingSku.id !== id) {
        throw new ConflictException(
          `Un produit avec le SKU "${updateProductDto.sku}" existe déjà`,
        );
      }
    }

    // Vérifier la catégorie si modifiée
    if (
      updateProductDto.categoryId &&
      updateProductDto.categoryId !== product.categoryId
    ) {
      const category = await this.categoriesService.findOne(
        updateProductDto.categoryId,
      );
      if (!category) {
        throw new NotFoundException(
          `Catégorie avec l'ID "${updateProductDto.categoryId}" non trouvée`,
        );
      }
    }

    // Vérifier le fournisseur si modifié
    if (
      updateProductDto.supplierId &&
      updateProductDto.supplierId !== product.supplierId
    ) {
      const supplier = await this.suppliersService.findOne(
        updateProductDto.supplierId,
      );
      if (!supplier) {
        throw new NotFoundException(
          `Fournisseur avec l'ID "${updateProductDto.supplierId}" non trouvé`,
        );
      }
    }

    // Mettre à jour le slug si le nom change
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      const newSlug = this.generateSlug(updateProductDto.name);
      const existingSlug = await this.productsRepository.findOne({
        where: { slug: newSlug },
      });

      if (existingSlug && existingSlug.id !== id) {
        throw new ConflictException(
          `Un produit avec le slug "${newSlug}" existe déjà`,
        );
      }

      product.slug = newSlug;
    }

    const oldData = { ...product };
    Object.assign(product, updateProductDto);
    const updatedProduct = await this.productsRepository.save(product);

    // Logger l'audit
    await this.auditService.log({
      userName: 'Système',
      action: AuditAction.UPDATE,
      resource: 'Product',
      resourceId: updatedProduct.id,
      details: `Modification du produit ${updatedProduct.name} (${updatedProduct.sku})`,
      oldData,
      newData: updatedProduct,
    });

    return updatedProduct;
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);

    // Supprimer d'abord les variantes
    if (product.variants && product.variants.length > 0) {
      await this.variantsRepository.remove(product.variants);
    }

    const productId = product.id;
    const productName = product.name;
    const productSku = product.sku;

    try {
      await this.productsRepository.remove(product);
      
      // Logger l'audit
      await this.auditService.log({
        userName: 'Système',
        action: AuditAction.DELETE,
        resource: 'Product',
        resourceId: productId,
        details: `Suppression du produit ${productName} (${productSku})`,
      });
    } catch (error) {
      // Si violation de clé étrangère (ex: lié aux commandes ou mouvements de stock)
      if (error.message && (error.message.includes('foreign key constraint') || error.message.includes('clé étrangère'))) {
        product.isActive = false;
        product.sku = `${product.sku || 'DEL'}-${Date.now().toString().slice(-6)}`;
        product.slug = `${product.slug}-${Date.now()}`;
        await this.productsRepository.save(product);
        
        // Logger l'audit comme archivage au lieu de suppression dure
        await this.auditService.log({
          userName: 'Système',
          action: AuditAction.UPDATE,
          resource: 'Product',
          resourceId: productId,
          details: `Archivage automatique (Soft Delete) suite à contrainte de liaison pour: ${productName}`,
        });
      } else {
        throw error;
      }
    }
  }

  async toggleStatus(id: string): Promise<Product> {
    const product = await this.findOne(id);
    product.isActive = !product.isActive;
    return await this.productsRepository.save(product);
  }

  async toggleFeatured(id: string): Promise<Product> {
    const product = await this.findOne(id);
    product.isFeatured = !product.isFeatured;
    return await this.productsRepository.save(product);
  }

  async updateStock(
    id: string,
    updateStockDto: UpdateStockDto,
    userId?: string,
  ): Promise<Product> {
    const product = await this.findOne(id);
    let movementType: StockMovementType;
    let quantity = updateStockDto.quantity;

    switch (updateStockDto.operation) {
      case StockOperation.SET:
        // Pour SET, on calcule la différence pour créer un mouvement IN ou OUT
        const diff = updateStockDto.quantity - product.stock;
        if (diff === 0) return product;
        
        movementType = diff > 0 ? StockMovementType.IN : StockMovementType.OUT;
        quantity = Math.abs(diff);
        break;
      case StockOperation.ADD:
        movementType = StockMovementType.IN;
        break;
      case StockOperation.REMOVE:
        movementType = StockMovementType.OUT;
        break;
      default:
        throw new BadRequestException('Opération de stock non reconnue');
    }

    await this.stockService.createMovement({
      productId: id,
      type: movementType,
      quantity: quantity,
      reason: updateStockDto.reason || 'Mise à jour manuelle du stock',
      userId: userId,
      allowNegative: updateStockDto.allowNegative,
    });

    return await this.findOne(id);
  }

  async getLowStockProducts(threshold?: number): Promise<Product[]> {
    const products = await this.productsRepository.find({
      where: { isActive: true },
      relations: ['category', 'supplier'],
    });

    return products.filter(
      (product) =>
        product.stock > 0 && product.stock <= (threshold || product.minStock),
    );
  }

  async getOutOfStockProducts(): Promise<Product[]> {
    return await this.productsRepository.find({
      where: { stock: 0, isActive: true },
      relations: ['category', 'supplier'],
    });
  }

  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    return await this.productsRepository.find({
      where: { isFeatured: true, isActive: true },
      relations: ['category'],
      take: limit,
      order: { createdAt: 'DESC' },
    });
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return await this.productsRepository.find({
      where: { categoryId, isActive: true },
      relations: ['category'],
      order: { name: 'ASC' },
    });
  }

  async getProductsBySupplier(supplierId: string): Promise<Product[]> {
    return await this.productsRepository.find({
      where: { supplierId, isActive: true },
      relations: ['supplier'],
      order: { name: 'ASC' },
    });
  }

  async searchProducts(query: string): Promise<Product[]> {
    return await this.productsRepository.find({
      where: [
        { name: Like(`%${query}%`) },
        { description: Like(`%${query}%`) },
        { sku: Like(`%${query}%`) },
        { barcode: Like(`%${query}%`) },
        { brand: Like(`%${query}%`) },
      ],
      relations: ['category'],
      take: 20,
    });
  }
 
  async getBestSellers(limit: number = 8): Promise<Product[]> {
    return await this.productsRepository.find({
      where: { isActive: true },
      relations: ['category'],
      order: { salesCount: 'DESC' },
      take: limit,
    });
  }
 
  async getRecommended(productId?: string, limit: number = 4): Promise<Product[]> {
    let categoryId: string | undefined;
    
    if (productId) {
      try {
        const product = await this.findOne(productId);
        categoryId = product.categoryId;
      } catch (error) {
        // Ignorer l'erreur si produit introuvable
      }
    }
 
    const baseWhere: any = { isActive: true };
    let results: Product[] = [];

    // Priorité à la même catégorie
    if (categoryId) {
      const sameCat = await this.productsRepository.find({
        where: productId ? { isActive: true, categoryId } : { isActive: true, categoryId },
        relations: ['category'],
        order: { salesCount: 'DESC' },
        take: limit * 2,
      });
      results = sameCat.filter(p => p.id !== productId);
    }

    // Compléter avec d'autres produits
    if (results.length < limit) {
      const existingIds = results.map(p => p.id);
      if (productId) existingIds.push(productId);

      const others = await this.productsRepository.find({
        where: { ...baseWhere },
        relations: ['category'],
        order: { salesCount: 'DESC' },
        take: limit * 3, // On prend plus pour mélanger
      });

      const filtered = others.filter(p => !existingIds.includes(p.id));
      results = [...results, ...filtered];
    }

    // Mélanger un peu pour la diversité (pas 100% aléatoire mais simule RANDOM())
    results = results.sort(() => Math.random() - 0.5);

    return results.slice(0, limit);
  }

  async bulkUpdateStock(
    updates: { id: string; stock: number }[],
  ): Promise<Product[]> {
    const updatedProducts: Product[] = [];

    for (const update of updates) {
      const product = await this.findOne(update.id);
      product.stock = Math.max(0, update.stock);
      updatedProducts.push(await this.productsRepository.save(product));
    }

    return updatedProducts;
  }

  async duplicateProduct(id: string): Promise<Product> {
    const product = await this.findOne(id);

    const duplicatedProduct = this.productsRepository.create({
      ...product,
      id: undefined,
      name: `${product.name} (Copy)`,
      sku: `${product.sku}-COPY-${Date.now()}`,
      slug: `${product.slug}-copy-${Date.now()}`,
      stock: 0,
      isActive: false,
      createdAt: undefined,
      updatedAt: undefined
    });

    return await this.productsRepository.save(duplicatedProduct);
  }
}
