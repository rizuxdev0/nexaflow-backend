// import {
//   Injectable,
//   NotFoundException,
//   ConflictException,
//   BadRequestException,
// } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository, Like, FindOptionsWhere } from 'typeorm';
// import { Supplier } from './entities/supplier.entity';
// import { CreateSupplierDto } from './dto/create-supplier.dto';
// import { UpdateSupplierDto } from './dto/update-supplier.dto';
// import {
//   PaginatedResponse,
//   PaginatedResponseBuilder,
// } from '../../common/interfaces/paginated-response.interface';

// type SupplierWithCount = Supplier & { productsCount: number };
// @Injectable()
// export class SuppliersService {
//   constructor(
//     @InjectRepository(Supplier)
//     private suppliersRepository: Repository<Supplier>,
//   ) {}

//   async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
//     // Vérifier si le code existe déjà
//     const existingCode = await this.suppliersRepository.findOne({
//       where: { code: createSupplierDto.code },
//     });

//     if (existingCode) {
//       throw new ConflictException(
//         `Un fournisseur avec le code "${createSupplierDto.code}" existe déjà`,
//       );
//     }

//     // Vérifier si l'email existe déjà
//     const existingEmail = await this.suppliersRepository.findOne({
//       where: { email: createSupplierDto.email },
//     });

//     if (existingEmail) {
//       throw new ConflictException(
//         `Un fournisseur avec l'email "${createSupplierDto.email}" existe déjà`,
//       );
//     }

//     const supplier = this.suppliersRepository.create(createSupplierDto);
//     return await this.suppliersRepository.save(supplier);
//   }

//   //   async findAll(
//   //     page: number = 1,
//   //     pageSize: number = 20,
//   //     search?: string,
//   //     isActive?: boolean,
//   //   ): Promise<PaginatedResponse<Supplier>> {
//   //     const where: FindOptionsWhere<Supplier> = {};

//   //     if (search) {
//   //       where.name = Like(`%${search}%`);
//   //     }

//   //     if (isActive !== undefined) {
//   //       where.isActive = isActive;
//   //     }

//   //     const [data, total] = await this.suppliersRepository.findAndCount({
//   //       where,
//   //       skip: (page - 1) * pageSize,
//   //       take: pageSize,
//   //       order: { name: 'ASC' },
//   //       relations: ['products'],
//   //     });

//   //     // Ajouter le compteur de produits
//   //     const dataWithCounts = data.map((supplier) => ({
//   //       ...supplier,
//   //       productsCount: supplier.products?.length || 0,
//   //       products: undefined, // Ne pas envoyer la liste complète des produits
//   //     }));

//   //     return PaginatedResponseBuilder.build(
//   //       dataWithCounts,
//   //       total,
//   //       page,
//   //       pageSize,
//   //     );
//   //   }
//   async findAll(
//     page: number = 1,
//     pageSize: number = 20,
//     search?: string,
//     isActive?: boolean,
//   ): Promise<PaginatedResponse<SupplierWithCount>> {
//     // ← Type plus précis
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
//       // Ne pas charger les produits pour éviter les données inutiles
//     });

//     // Compter les produits pour chaque fournisseur
//     const dataWithCounts: SupplierWithCount[] = await Promise.all(
//       data.map(async (supplier) => {
//         const result = await this.suppliersRepository
//           .createQueryBuilder('supplier')
//           .leftJoin('supplier.products', 'products')
//           .where('supplier.id = :id', { id: supplier.id })
//           .select('COUNT(products.id)', 'count')
//           .getRawOne();

//         return {
//           ...supplier,
//           productsCount: parseInt(result?.count) || 0,
//         };
//       }),
//     );

//     return PaginatedResponseBuilder.build(
//       dataWithCounts,
//       total,
//       page,
//       pageSize,
//     );
//   }

//   //   async findOne(id: string): Promise<Supplier> {
//   //     const supplier = await this.suppliersRepository.findOne({
//   //       where: { id },
//   //       relations: ['products'],
//   //     });

//   //     if (!supplier) {
//   //       throw new NotFoundException(`Fournisseur avec l'ID "${id}" non trouvé`);
//   //     }

//   //     return supplier;
//   //   }
//   async findOne(id: string): Promise<Supplier> {
//     const supplier = await this.suppliersRepository.findOne({
//       where: { id },
//       relations: ['products'], // ← Ici on charge les produits
//     });

//     if (!supplier) {
//       throw new NotFoundException(`Fournisseur avec l'ID "${id}" non trouvé`);
//     }

//     return supplier;
//   }
//   async update(
//     id: string,
//     updateSupplierDto: UpdateSupplierDto,
//   ): Promise<Supplier> {
//     const supplier = await this.findOne(id);

//     // Vérifier l'unicité du code si modifié
//     if (updateSupplierDto.code && updateSupplierDto.code !== supplier.code) {
//       const existingCode = await this.suppliersRepository.findOne({
//         where: { code: updateSupplierDto.code },
//       });

//       if (existingCode && existingCode.id !== id) {
//         throw new ConflictException(
//           `Un fournisseur avec le code "${updateSupplierDto.code}" existe déjà`,
//         );
//       }
//     }

//     // Vérifier l'unicité de l'email si modifié
//     if (updateSupplierDto.email && updateSupplierDto.email !== supplier.email) {
//       const existingEmail = await this.suppliersRepository.findOne({
//         where: { email: updateSupplierDto.email },
//       });

//       if (existingEmail && existingEmail.id !== id) {
//         throw new ConflictException(
//           `Un fournisseur avec l'email "${updateSupplierDto.email}" existe déjà`,
//         );
//       }
//     }

//     Object.assign(supplier, updateSupplierDto);
//     return await this.suppliersRepository.save(supplier);
//   }

//   async remove(id: string): Promise<void> {
//     const supplier = await this.findOne(id);

//     // Vérifier si le fournisseur a des produits
//     if (supplier.products && supplier.products.length > 0) {
//       throw new BadRequestException(
//         `Impossible de supprimer le fournisseur car il a ${supplier.products.length} produit(s) associé(s)`,
//       );
//     }

//     await this.suppliersRepository.remove(supplier);
//   }

//   async toggleStatus(id: string): Promise<Supplier> {
//     const supplier = await this.findOne(id);
//     supplier.isActive = !supplier.isActive;
//     return await this.suppliersRepository.save(supplier);
//   }

//   async findByCode(code: string): Promise<Supplier> {
//     const supplier = await this.suppliersRepository.findOne({
//       where: { code },
//     });

//     if (!supplier) {
//       throw new NotFoundException(
//         `Fournisseur avec le code "${code}" non trouvé`,
//       );
//     }

//     return supplier;
//   }

//   async getTopSuppliers(limit: number = 10): Promise<Supplier[]> {
//     return await this.suppliersRepository.find({
//       where: { isActive: true },
//       order: { rating: 'DESC' },
//       take: limit,
//     });
//   }
// }
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
  PurchaseOrderStatus,
  PurchasePaymentStatus,
} from '../purchase-orders/entities/purchase-order.entity';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';

// Interface pour le type retourné
interface SupplierWithCount extends Supplier {
  productsCount: number;
}

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private suppliersRepository: Repository<Supplier>,
  ) {}

  async create(createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    // 1. Gérer la génération du code si absent
    if (!createSupplierDto.code || createSupplierDto.code.trim() === '') {
      const timestamp = new Date().getTime().toString().slice(-4);
      const random = Math.floor(Math.random() * 1000)
        .toString()
        .padStart(3, '0');
      createSupplierDto.code = `SUP-${timestamp}${random}`;
    }

    // 2. Vérifier si le code existe déjà
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

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    isActive?: boolean,
  ): Promise<PaginatedResponse<Supplier>> {
    // Construction de la requête
    const queryBuilder =
      this.suppliersRepository.createQueryBuilder('supplier');

    // Filtres
    if (search) {
      queryBuilder.where(
        '(supplier.name ILIKE :search OR supplier.code ILIKE :search OR supplier.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('supplier.isActive = :isActive', { isActive });
    }

    // Compter le total AVANT pagination
    const total = await queryBuilder.getCount();

    // Appliquer la pagination et récupérer les données
    const data = await queryBuilder
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy('supplier.name', 'ASC')
      .getMany();

    // Compter les produits et calculer les stats pour chaque fournisseur
    const dataWithStats = await Promise.all(
      data.map(async (supplier) => {
        const statsQuery = await this.suppliersRepository
          .createQueryBuilder('supplier')
          .leftJoin('supplier.products', 'products')
          .leftJoin('supplier.purchaseOrders', 'purchaseOrders')
          .where('supplier.id = :id', { id: supplier.id })
          .select([
            'COUNT(DISTINCT products.id) as productsCount',
            'COUNT(DISTINCT purchaseOrders.id) as ordersCount',
            'SUM(CASE WHEN purchaseOrders.paymentStatus != :paid THEN CAST(purchaseOrders.total AS DECIMAL) - CAST(purchaseOrders.paidAmount AS DECIMAL) ELSE 0 END) as totalDebt',
            'COUNT(CASE WHEN purchaseOrders.status IN (:received, :partial) THEN 1 END) as deliveriesCount',
            'COUNT(CASE WHEN purchaseOrders.receivedDate IS NOT NULL AND purchaseOrders.status IN (:received, :partial) AND purchaseOrders.receivedDate <= purchaseOrders.expectedDate THEN 1 END) as onTimeCount'
          ])
          .setParameters({
            id: supplier.id,
            paid: PurchasePaymentStatus.PAID,
            received: PurchaseOrderStatus.RECEIVED,
            partial: PurchaseOrderStatus.PARTIAL
          })
          .getRawOne();

        const deliveriesWithDate = await this.suppliersRepository
          .createQueryBuilder('supplier')
          .leftJoin('supplier.purchaseOrders', 'po')
          .where('supplier.id = :id AND po.status IN (:...status) AND po.receivedDate IS NOT NULL', {
            id: supplier.id,
            status: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.PARTIAL]
          })
          .getCount();

        return {
          ...supplier,
          productsCount: parseInt(statsQuery?.productscount) || 0,
          totalOrders: parseInt(statsQuery?.orderscount) || 0,
          totalDebt: parseFloat(statsQuery?.totaldebt) || 0,
          totalDeliveries: parseInt(statsQuery?.deliveriescount) || 0,
          onTimeRate: deliveriesWithDate > 0 
            ? Math.round((parseInt(statsQuery?.ontimecount) / deliveriesWithDate) * 100) 
            : 0,
        };
      }),
    );

    // Retourner la réponse paginée complète
    return PaginatedResponseBuilder.build(
      dataWithStats,
      total,
      page,
      pageSize,
    );
  }

  async findOne(id: string): Promise<any> {
    const supplier = await this.suppliersRepository.findOne({
      where: { id },
      relations: ['products', 'purchaseOrders'],
    });

    if (!supplier) {
      throw new NotFoundException(`Fournisseur avec l'ID "${id}" non trouvé`);
    }

    // Calculer les statistiques
    const pos = supplier.purchaseOrders || [];
    const stats = {
      totalOrders: pos.length,
      totalProducts: supplier.products?.length || 0,
      totalDebt: pos
        .filter((po) => po.paymentStatus !== PurchasePaymentStatus.PAID)
        .reduce((sum, po) => sum + (Number(po.total) - Number(po.paidAmount)), 0),
      totalDeliveries: pos.filter(
        (po) =>
          po.status === PurchaseOrderStatus.RECEIVED ||
          po.status === PurchaseOrderStatus.PARTIAL,
      ).length,
      onTimeRate: 0,
    };

    // Calculer le taux de ponctualité (si possible)
    const deliveredPos = pos.filter((po) => po.receivedDate);
    if (deliveredPos.length > 0) {
      const onTimePos = deliveredPos.filter(
        (po) => po.receivedDate <= po.expectedDate,
      );
      stats.onTimeRate = Math.round(
        (onTimePos.length / deliveredPos.length) * 100,
      );
    }

    return {
      ...supplier,
      ...stats,
    };
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

  async findAllFlat(): Promise<Supplier[]> {
    return await this.suppliersRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getTopSuppliers(limit: number = 10): Promise<Supplier[]> {
    return await this.suppliersRepository.find({
      where: { isActive: true },
      order: { rating: 'DESC' },
      take: limit,
    });
  }

  async getGlobalStats() {
    const suppliers = await this.suppliersRepository.find({
      relations: ['purchaseOrders'],
    });

    const activeCount = suppliers.filter((s) => s.isActive).length;
    let totalDebt = 0;
    let totalDeliveries = 0;
    let onTimeCount = 0;
    let totalDeliveredPos = 0;

    suppliers.forEach((supplier) => {
      const pos = supplier.purchaseOrders || [];
      
      // Dettes
      pos.forEach((po) => {
        if (po.paymentStatus !== PurchasePaymentStatus.PAID) {
          totalDebt += Number(po.total) - Number(po.paidAmount);
        }

        // Livraisons
        if (
          po.status === PurchaseOrderStatus.RECEIVED ||
          po.status === PurchaseOrderStatus.PARTIAL
        ) {
          totalDeliveries++;
          
          if (po.receivedDate) {
            totalDeliveredPos++;
            const received = new Date(po.receivedDate);
            const expected = new Date(po.expectedDate);
            if (received <= expected) {
              onTimeCount++;
            }
          }
        }
      });
    });

    return {
      totalSuppliers: suppliers.length,
      activeSuppliers: activeCount,
      totalDebt,
      totalDeliveries,
      onTimeRate: totalDeliveredPos > 0 
        ? Math.round((onTimeCount / totalDeliveredPos) * 100) 
        : 0,
    };
  }
}
