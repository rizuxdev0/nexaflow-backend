import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';

type SupplierWithCount = Supplier & { productsCount: number };
@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private suppliersRepository: Repository<Supplier>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // Vérifier si le code existe déjà
    const existingCode = await this.suppliersRepository.findOne({
      where: { code: createSupplierDto.code },
    });

    if (existingCode) {
      throw new ConflictException(
        `Un fournisseur avec le code "${createSupplierDto.code}" existe déjà`,
      );
    }

    // Vérifier si l'email existe déjà
    const existingEmail = await this.suppliersRepository.findOne({
      where: { email: createSupplierDto.email },
    });

    if (existingEmail) {
      throw new ConflictException(
        `Un fournisseur avec l'email "${createSupplierDto.email}" existe déjà`,
      );
    }

    const supplier = this.suppliersRepository.create(createSupplierDto);
    return await this.suppliersRepository.save(supplier);
  }

  //   async findAll(
  //     page: number = 1,
  //     pageSize: number = 20,
  //     search?: string,
  //     isActive?: boolean,
  //   ): Promise<PaginatedResponse<Supplier>> {
  //     const where: FindOptionsWhere<Supplier> = {};

  //     if (search) {
  //       where.name = Like(`%${search}%`);
  //     }

  //     if (isActive !== undefined) {
  //       where.isActive = isActive;
  //     }

  //     const [data, total] = await this.suppliersRepository.findAndCount({
  //       where,
  //       skip: (page - 1) * pageSize,
  //       take: pageSize,
  //       order: { name: 'ASC' },
  //       relations: ['products'],
  //     });

  //     // Ajouter le compteur de produits
  //     const dataWithCounts = data.map((supplier) => ({
  //       ...supplier,
  //       productsCount: supplier.products?.length || 0,
  //       products: undefined, // Ne pas envoyer la liste complète des produits
  //     }));

  //     return PaginatedResponseBuilder.build(
  //       dataWithCounts,
  //       total,
  //       page,
  //       pageSize,
  //     );
  //   }
  async findAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    isActive?: boolean,
  ): Promise<PaginatedResponse<SupplierWithCount>> {
    // ← Type plus précis
    const where: FindOptionsWhere<Supplier> = {};

    if (search) {
      where.name = Like(`%${search}%`);
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await this.suppliersRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { name: 'ASC' },
      // Ne pas charger les produits pour éviter les données inutiles
    });

    // Compter les produits pour chaque fournisseur
    const dataWithCounts: SupplierWithCount[] = await Promise.all(
      data.map(async (supplier) => {
        const result = await this.suppliersRepository
          .createQueryBuilder('supplier')
          .leftJoin('supplier.products', 'products')
          .where('supplier.id = :id', { id: supplier.id })
          .select('COUNT(products.id)', 'count')
          .getRawOne();

        return {
          ...supplier,
          productsCount: parseInt(result?.count) || 0,
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

  //   async findOne(id: string): Promise<Supplier> {
  //     const supplier = await this.suppliersRepository.findOne({
  //       where: { id },
  //       relations: ['products'],
  //     });

  //     if (!supplier) {
  //       throw new NotFoundException(`Fournisseur avec l'ID "${id}" non trouvé`);
  //     }

  //     return supplier;
  //   }
  async findOne(id: string): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({
      where: { id },
      relations: ['products'], // ← Ici on charge les produits
    });

    if (!supplier) {
      throw new NotFoundException(`Fournisseur avec l'ID "${id}" non trouvé`);
    }

    return supplier;
  }
  async update(
    id: string,
    updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    const supplier = await this.findOne(id);

    // Vérifier l'unicité du code si modifié
    if (updateSupplierDto.code && updateSupplierDto.code !== supplier.code) {
      const existingCode = await this.suppliersRepository.findOne({
        where: { code: updateSupplierDto.code },
      });

      if (existingCode && existingCode.id !== id) {
        throw new ConflictException(
          `Un fournisseur avec le code "${updateSupplierDto.code}" existe déjà`,
        );
      }
    }

    // Vérifier l'unicité de l'email si modifié
    if (updateSupplierDto.email && updateSupplierDto.email !== supplier.email) {
      const existingEmail = await this.suppliersRepository.findOne({
        where: { email: updateSupplierDto.email },
      });

      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException(
          `Un fournisseur avec l'email "${updateSupplierDto.email}" existe déjà`,
        );
      }
    }

    Object.assign(supplier, updateSupplierDto);
    return await this.suppliersRepository.save(supplier);
  }

  async remove(id: string): Promise<void> {
    const supplier = await this.findOne(id);

    // Vérifier si le fournisseur a des produits
    if (supplier.products && supplier.products.length > 0) {
      throw new BadRequestException(
        `Impossible de supprimer le fournisseur car il a ${supplier.products.length} produit(s) associé(s)`,
      );
    }

    await this.suppliersRepository.remove(supplier);
  }

  async toggleStatus(id: string): Promise<Supplier> {
    const supplier = await this.findOne(id);
    supplier.isActive = !supplier.isActive;
    return await this.suppliersRepository.save(supplier);
  }

  async findByCode(code: string): Promise<Supplier> {
    const supplier = await this.suppliersRepository.findOne({
      where: { code },
    });

    if (!supplier) {
      throw new NotFoundException(
        `Fournisseur avec le code "${code}" non trouvé`,
      );
    }

    return supplier;
  }

  async getTopSuppliers(limit: number = 10): Promise<Supplier[]> {
    return await this.suppliersRepository.find({
      where: { isActive: true },
      order: { rating: 'DESC' },
      take: limit,
    });
  }
}
