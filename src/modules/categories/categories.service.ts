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

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Vérifier si le nom existe déjà
    const existingCategory = await this.categoriesRepository.findOne({
      where: { name: createCategoryDto.name },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Une catégorie avec le nom "${createCategoryDto.name}" existe déjà`,
      );
    }

    // Générer le slug
    const slug = this.generateSlug(createCategoryDto.name);

    // Vérifier si le slug est unique
    const existingSlug = await this.categoriesRepository.findOne({
      where: { slug },
    });

    if (existingSlug) {
      throw new ConflictException(`Le slug "${slug}" existe déjà`);
    }

    // Vérifier si la catégorie parente existe
    if (createCategoryDto.parentId) {
      const parentCategory = await this.categoriesRepository.findOne({
        where: { id: createCategoryDto.parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException(
          `Catégorie parente avec l'ID "${createCategoryDto.parentId}" non trouvée`,
        );
      }
    }

    const category = this.categoriesRepository.create({
      ...createCategoryDto,
      slug,
    });

    return await this.categoriesRepository.save(category);
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

    const [data, total] = await this.categoriesRepository.findAndCount({
      where,
      relations: ['parent', 'children'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { name: 'ASC' },
    });

    // Ajouter le compteur de produits
    const dataWithCounts = await Promise.all(
      data.map(async (category) => {
        const productsCount = await this.categoriesRepository
          .createQueryBuilder('category')
          .leftJoin('category.products', 'products')
          .where('category.id = :id', { id: category.id })
          .select('COUNT(products.id)', 'count')
          .getRawOne();

        return {
          ...category,
          productsCount: parseInt(productsCount.count) || 0,
        };
      }),
    );

    return PaginatedResponseBuilder.build(
      dataWithCounts,
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(`Catégorie avec l'ID "${id}" non trouvée`);
    }

    return category;
  }

  async findBySlug(slug: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { slug },
      relations: ['parent', 'children', 'products'],
    });

    if (!category) {
      throw new NotFoundException(
        `Catégorie avec le slug "${slug}" non trouvée`,
      );
    }

    return category;
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOne(id);

    // Vérifier si le nom est modifié et unique
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoriesRepository.findOne({
        where: { name: updateCategoryDto.name },
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(
          `Une catégorie avec le nom "${updateCategoryDto.name}" existe déjà`,
        );
      }

      // Mettre à jour le slug
      category.slug = this.generateSlug(updateCategoryDto.name);
    }

    // Vérifier la catégorie parente
    if (updateCategoryDto.parentId) {
      // Empêcher de se définir comme parent
      if (updateCategoryDto.parentId === id) {
        throw new BadRequestException(
          'Une catégorie ne peut pas être son propre parent',
        );
      }

      const parentCategory = await this.categoriesRepository.findOne({
        where: { id: updateCategoryDto.parentId },
      });

      if (!parentCategory) {
        throw new NotFoundException(
          `Catégorie parente avec l'ID "${updateCategoryDto.parentId}" non trouvée`,
        );
      }
    }

    Object.assign(category, updateCategoryDto);
    return await this.categoriesRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);

    // Vérifier si la catégorie a des produits
    const productsCount = await this.categoriesRepository
      .createQueryBuilder('category')
      .leftJoin('category.products', 'products')
      .where('category.id = :id', { id })
      .getCount();

    if (productsCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer la catégorie car elle contient ${productsCount} produit(s)`,
      );
    }

    // Vérifier si la catégorie a des enfants
    const childrenCount = await this.categoriesRepository.count({
      where: { parentId: id },
    });

    if (childrenCount > 0) {
      throw new BadRequestException(
        `Impossible de supprimer la catégorie car elle a ${childrenCount} sous-catégorie(s)`,
      );
    }

    await this.categoriesRepository.remove(category);
  }

  async toggleStatus(id: string): Promise<Category> {
    const category = await this.findOne(id);
    category.isActive = !category.isActive;
    return await this.categoriesRepository.save(category);
  }

  async getCategoryTree(): Promise<Category[]> {
    const categories = await this.categoriesRepository.find({
      //   where: { parentId: null },
      where: { parentId: IsNull() },
      relations: ['children', 'children.children'],
      order: { name: 'ASC' },
    });

    return categories;
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Enlève les caractères spéciaux
      .replace(/[\s_-]+/g, '-') // Remplace les espaces et underscores par des tirets
      .replace(/^-+|-+$/g, ''); // Enlève les tirets au début et à la fin
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
