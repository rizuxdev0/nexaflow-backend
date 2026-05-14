import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, IsNull } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class CategoriesService extends AbstractTenantService<Category> {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    tenantService: TenantService,
  ) {
    super(categoriesRepository, tenantService, 'Category');
  }

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    const existingCategory = await this.repo.findOne({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory) {
      throw new ConflictException(`Une catégorie avec le nom "${createCategoryDto.name}" existe déjà`);
    }

    const slug = this.generateSlug(createCategoryDto.name);
    const existingSlug = await this.repo.findOne({ where: { slug } });

    if (existingSlug) {
      throw new ConflictException(`Le slug "${slug}" existe déjà`);
    }

    if (createCategoryDto.parentId) {
      const parentCategory = await this.repo.findOne({
        where: { id: createCategoryDto.parentId },
      });
      if (!parentCategory) {
        throw new NotFoundException(`Catégorie parente avec l'ID "${createCategoryDto.parentId}" non trouvée`);
      }
    }

    const category = this.repo.create({
      ...createCategoryDto,
      slug,
      vendorId: this.tenantService.getVendorId() || undefined,
    });

    return await this.repo.save(category);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    isActive?: boolean,
  ): Promise<PaginatedResponse<Category>> {
    const where: FindOptionsWhere<Category> = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['parent', 'children'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { name: 'ASC' },
    });

    // Ajouter le compteur de produits
    const dataWithCounts = await Promise.all(
      data.map(async (category) => {
        const result = await this.repo
          .createQueryBuilder('category')
          .leftJoin('category.products', 'products')
          .where('category.id = :id', { id: category.id })
          .select('COUNT(products.id)', 'count')
          .getRawOne();

        return {
          ...category,
          productCount: parseInt(result.count) || 0,
        };
      }),
    );

    return PaginatedResponseBuilder.build(dataWithCounts, total, page, pageSize);
  }

  async findOne(id: string): Promise<Category> {
    return super.findOne(id, ['parent', 'children', 'products']);
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.repo.findOne({
      where: { slug },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec le slug "${slug}" non trouvée`);
    }

    return category;
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
    const category = await this.findOne(id);

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.repo.findOne({
        where: { name: updateCategoryDto.name },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(`Une catégorie avec le nom "${updateCategoryDto.name}" existe déjà`);
      }
      category.slug = this.generateSlug(updateCategoryDto.name);
    }

    if (updateCategoryDto.parentId) {
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException('Une catégorie ne peut pas être son propre parent');
      }
      const parentCategory = await this.repo.findOne({
        where: { id: updateCategoryDto.parentId },
      });
      if (!parentCategory) {
        throw new NotFoundException(`Catégorie parente avec l'ID "${updateCategoryDto.parentId}" non trouvée`);
      }
    }

    Object.assign(category, updateCategoryDto);
    return await this.repo.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    const result = await this.repo
      .createQueryBuilder('category')
      .innerJoin('category.products', 'products')
      .where('category.id = :id', { id })
      .select('COUNT(products.id)', 'count')
      .getRawOne();

    const actualProductsCount = parseInt(result.count) || 0;
    if (actualProductsCount > 0) {
      throw new BadRequestException(`Impossible de supprimer la catégorie car elle contient ${actualProductsCount} produit(s)`);
    }

    const childrenCount = await this.repo.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(`Impossible de supprimer la catégorie car elle a ${childrenCount} sous-catégorie(s)`);
    }

    await this.repo.remove(category);
  }

  async toggleStatus(id: string): Promise<Category> {
    const category = await this.findOne(id);
    category.isActive = !category.isActive;
    return await this.repo.save(category);
  }

  async findAllFlat(): Promise<Category[]> {
    return await this.repo.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getCategoryTree(): Promise<Category[]> {
    return await this.repo.find({
      where: { parentId: IsNull() },
      relations: ['children', 'children.children'],
      order: { name: 'ASC' },
    });
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

  //   private generateSlug(name: string): string {
  //     return slugify.default(name, {
  //       // ← Si vous utilisez import * as slugify
  //       lower: true,
  //       strict: true,
  //       locale: 'fr',
  //       trim: true,
  //     });
  //   }
}
