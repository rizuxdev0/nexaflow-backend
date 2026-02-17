import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from './entities/product-variant.entity';
import { Product } from './entities/product.entity';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { VariantResponseDto } from './dto/variant-response.dto';

@Injectable()
export class VariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private variantsRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
  ) {}

  async create(
    productId: string,
    createVariantDto: CreateVariantDto,
  ): Promise<ProductVariant> {
    // Vérifier que le produit existe
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Produit avec l'ID ${productId} non trouvé`);
    }

    // Vérifier l'unicité du SKU
    const existingSku = await this.variantsRepository.findOne({
      where: { sku: createVariantDto.sku },
    });

    if (existingSku) {
      throw new ConflictException(
        `Une variante avec le SKU ${createVariantDto.sku} existe déjà`,
      );
    }

    const variant = this.variantsRepository.create({
      ...createVariantDto,
      productId,
    });

    return await this.variantsRepository.save(variant);
  }

  async findAll(productId: string): Promise<VariantResponseDto[]> {
    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Produit avec l'ID ${productId} non trouvé`);
    }

    const variants = await this.variantsRepository.find({
      where: { productId },
      order: { createdAt: 'ASC' },
    });

    return variants.map((variant) =>
      this.mapToResponseDto(variant, product.price),
    );
  }

  async findOne(id: string): Promise<ProductVariant> {
    const variant = await this.variantsRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!variant) {
      throw new NotFoundException(`Variante avec l'ID ${id} non trouvée`);
    }

    return variant;
  }

  async update(
    productId: string,
    variantId: string,
    updateVariantDto: UpdateVariantDto,
  ): Promise<ProductVariant> {
    const variant = await this.findOne(variantId);

    // Vérifier que la variante appartient bien au produit
    if (variant.productId !== productId) {
      throw new BadRequestException(
        "Cette variante n'appartient pas au produit spécifié",
      );
    }

    // Vérifier l'unicité du SKU si modifié
    if (updateVariantDto.sku && updateVariantDto.sku !== variant.sku) {
      const existingSku = await this.variantsRepository.findOne({
        where: { sku: updateVariantDto.sku },
      });

      if (existingSku && existingSku.id !== variantId) {
        throw new ConflictException(
          `Une variante avec le SKU ${updateVariantDto.sku} existe déjà`,
        );
      }
    }

    Object.assign(variant, updateVariantDto);
    return await this.variantsRepository.save(variant);
  }

  async remove(productId: string, variantId: string): Promise<void> {
    const variant = await this.findOne(variantId);

    if (variant.productId !== productId) {
      throw new BadRequestException(
        "Cette variante n'appartient pas au produit spécifié",
      );
    }

    await this.variantsRepository.remove(variant);
  }

  async updateStock(
    variantId: string,
    quantity: number,
  ): Promise<ProductVariant> {
    const variant = await this.findOne(variantId);
    variant.stock = Math.max(0, quantity);
    return await this.variantsRepository.save(variant);
  }

  async getTotalStock(productId: string): Promise<number> {
    const variants = await this.variantsRepository.find({
      where: { productId },
    });

    return variants.reduce((sum, v) => sum + v.stock, 0);
  }

  private mapToResponseDto(
    variant: ProductVariant,
    basePrice: number,
  ): VariantResponseDto {
    return {
      id: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      name: variant.name,
      size: variant.size,
      color: variant.color,
      material: variant.material,
      weight: variant.weight,
      priceModifier: variant.priceModifier,
      price: basePrice + (variant.priceModifier || 0),
      stock: variant.stock,
      images: variant.images || [],
      isActive: variant.isActive,
      createdAt: variant.createdAt,
      updatedAt: variant.updatedAt,
    };
  }
}
