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

    return await this.productsRepository.save(product);
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

    Object.assign(product, updateProductDto);
    return await this.productsRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);

    // Supprimer d'abord les variantes
    if (product.variants && product.variants.length > 0) {
      await this.variantsRepository.remove(product.variants);
    }

    await this.productsRepository.remove(product);
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
  ): Promise<Product> {
    const product = await this.findOne(id);

    let newStock = product.stock;

    switch (updateStockDto.operation) {
      case StockOperation.SET:
        newStock = updateStockDto.quantity;
        break;
      case StockOperation.ADD:
        newStock = product.stock + updateStockDto.quantity;
        break;
      case StockOperation.REMOVE:
        if (product.stock < updateStockDto.quantity) {
          throw new BadRequestException(
            `Stock insuffisant. Stock actuel: ${product.stock}, quantité à retirer: ${updateStockDto.quantity}`,
          );
        }
        newStock = product.stock - updateStockDto.quantity;
        break;
    }

    if (newStock < 0) {
      throw new BadRequestException('Le stock ne peut pas être négatif');
    }

    product.stock = newStock;
    return await this.productsRepository.save(product);
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
    const product = await this.productsRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Produit avec l'ID "${id}" non trouvé`);
    }

    const duplicatedProduct = this.productsRepository.create({
      name: `${product.name} (Copie)`,
      description: product.description,
      price: product.price,
      costPrice: product.costPrice,
      sku: `${product.sku}-COPY-${Date.now()}`,
      barcode: product.barcode,
      brand: product.brand,
      categoryId: product.categoryId,
      supplierId: product.supplierId,
      slug: `${product.slug}-copy-${Date.now()}`,
      stock: 0, // sécuritéj
      minStock: product.minStock,
      isActive: false, // ne pas publier automatiquement
      isFeatured: false,
      images: product.images ?? [],
      tags: product.tags ?? [],
    });

    return await this.productsRepository.save(duplicatedProduct);
  }

  //   async duplicateProduct(id: string): Promise<Product> {
  //     const product = await this.findOne(id);

  //     const { id: _, createdAt, updatedAt, ...productData } = product;

  //     const duplicatedProduct = this.productsRepository.create({
  //       ...productData,
  //       name: `${product.name} (Copie)`,
  //       sku: `${product.sku}-COPY-${Date.now()}`,
  //       slug: `${product.slug}-copy-${Date.now()}`,
  //       stock: 0,
  //       isActive: false,
  //     });

  //     return await this.productsRepository.save(duplicatedProduct);
  //   }
}
