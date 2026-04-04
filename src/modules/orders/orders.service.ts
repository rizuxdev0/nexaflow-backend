import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Product } from '../products/entities/product.entity';
import { ProductVariant } from '../products/entities/product-variant.entity';
import {
  CashSession,
  SessionStatus,
} from '../cash-sessions/entities/cash-session.entity';

import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';
import {
  CreatePosOrderDto,
  DiscountType,
  PaymentMethod,
} from '../products/dto/create-pos-order.dto';
import { PosOrderResponseDto } from '../products/dto/pos-order-response.dto';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';
import { StockService } from '../stock/stock.service';
import { StockMovementType } from '../stock/entities/stock-movement.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private productsRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantsRepository: Repository<ProductVariant>,
    @InjectRepository(CashSession)
    private sessionsRepository: Repository<CashSession>,
    private dataSource: DataSource,
    private auditService: AuditService,
    private stockService: StockService,
  ) {}

  //   async createPosOrder(
  //     createPosOrderDto: CreatePosOrderDto,
  //     userId: string,
  //   ): Promise<PosOrderResponseDto> {
  //     const queryRunner = this.dataSource.createQueryRunner();
  //     await queryRunner.connect();
  //     await queryRunner.startTransaction();

  //     try {
  //       // 1. Vérifier que la session est ouverte
  //       const session = await this.sessionsRepository.findOne({
  //         where: { id: createPosOrderDto.sessionId, status: SessionStatus.OPEN },
  //       });

  //       if (!session) {
  //         throw new BadRequestException(
  //           'Session de caisse non trouvée ou fermée',
  //         );
  //       }

  //       // 2. Calculer le sous-total depuis les prix en base
  //       const { items, subtotal } = await this.calculateItemsSubtotal(
  //         createPosOrderDto.items,
  //       );

  //       // 3. Calculer la remise
  //       let discountAmount = 0;
  //       if (createPosOrderDto.discountType && createPosOrderDto.discountValue) {
  //         if (createPosOrderDto.discountType === DiscountType.PERCENTAGE) {
  //           if (createPosOrderDto.discountValue > 100) {
  //             throw new BadRequestException(
  //               'Le pourcentage de remise ne peut pas dépasser 100%',
  //             );
  //           }
  //           discountAmount = Math.round(
  //             subtotal * (createPosOrderDto.discountValue / 100),
  //           );
  //         } else if (createPosOrderDto.discountType === DiscountType.FIXED) {
  //           if (createPosOrderDto.discountValue > subtotal) {
  //             throw new BadRequestException(
  //               'La remise fixe ne peut pas dépasser le sous-total',
  //             );
  //           }
  //           discountAmount = createPosOrderDto.discountValue;
  //         }
  //       }

  //       const afterDiscount = subtotal - discountAmount;

  //       // 4. Calculer la TVA (18% par défaut)
  //       const taxRate = 0.18;
  //       const taxAmount = Math.round(afterDiscount * taxRate);
  //       const total = afterDiscount + taxAmount;

  //       // 5. Vérifier le montant remis pour les espèces
  //       let change = 0;
  //       if (createPosOrderDto.paymentMethod === PaymentMethod.CASH) {
  //         if (!createPosOrderDto.tenderedAmount) {
  //           throw new BadRequestException(
  //             'Le montant remis est requis pour les paiements en espèces',
  //           );
  //         }
  //         if (createPosOrderDto.tenderedAmount < total) {
  //           throw new BadRequestException(
  //             `Montant insuffisant. Total: ${total}, remis: ${createPosOrderDto.tenderedAmount}`,
  //           );
  //         }
  //         change = createPosOrderDto.tenderedAmount - total;
  //       }

  //       // 6. Générer le numéro de commande
  //       const orderNumber = await this.generateOrderNumber('POS');

  //       // 7. Créer la commande
  //       const order = this.ordersRepository.create({
  //         orderNumber,
  //         subtotal,
  //         discountAmount,
  //         taxAmount,
  //         total,
  //         status: OrderStatus.COMPLETED,
  //         paymentStatus: PaymentStatus.PAID,
  //         paymentMethod: createPosOrderDto.paymentMethod,
  //         sessionId: createPosOrderDto.sessionId,
  //         userId,
  //         customerId: createPosOrderDto.customerId,
  //         notes: createPosOrderDto.notes,
  //         orderDate: new Date(),
  //       });

  //       const savedOrder = await queryRunner.manager.save(order);

  //       // 8. Créer les items et décrémenter le stock
  //       for (const item of items) {
  //         const orderItem = this.orderItemsRepository.create({
  //           orderId: savedOrder.id,
  //           productId: item.productId,
  //           variantId: item.variantId,
  //           productName: item.product.name,
  //           productSku: item.variant?.sku || item.product.sku,
  //           quantity: item.quantity,
  //           unitPrice: item.unitPrice,
  //           totalPrice: item.unitPrice * item.quantity,
  //           taxRate,
  //           taxAmount: Math.round(item.unitPrice * item.quantity * taxRate),
  //         });
  //         await queryRunner.manager.save(orderItem);

  //         // Décrémenter le stock
  //         if (item.variant) {
  //           item.variant.stock -= item.quantity;
  //           await queryRunner.manager.save(item.variant);
  //         } else {
  //           item.product.stock -= item.quantity;
  //           await queryRunner.manager.save(item.product);
  //         }
  //       }

  //       // 9. Mettre à jour la session de caisse
  //       session.salesCount += 1;
  //       session.salesTotal = Number(session.salesTotal) + total;
  //       if (createPosOrderDto.paymentMethod === PaymentMethod.CASH) {
  //         session.cashIn = Number(session.cashIn) + total;
  //       }

  //       // Mettre à jour les statistiques de paiement
  //       const paymentIndex = session.payments.findIndex(
  //         (p) => p.method === createPosOrderDto.paymentMethod,
  //       );
  //       if (paymentIndex >= 0) {
  //         session.payments[paymentIndex].count += 1;
  //         session.payments[paymentIndex].total =
  //           Number(session.payments[paymentIndex].total) + total;
  //       } else {
  //         session.payments.push({
  //           method: createPosOrderDto.paymentMethod,
  //           count: 1,
  //           total: total,
  //         });
  //       }

  //       await queryRunner.manager.save(session);

  //       // 10. Audit log
  //       await this.auditService.log({
  //         userId,
  //         userName: 'Utilisateur', // À remplacer par le vrai nom
  //         action: AuditAction.SALE,
  //         resource: 'Order',
  //         resourceId: savedOrder.id,
  //         details: `Vente POS #${orderNumber} - Total: ${total} FCFA`,
  //         newData: savedOrder,
  //       });

  //       await queryRunner.commitTransaction();

  //       return {
  //         id: savedOrder.id,
  //         orderNumber: savedOrder.orderNumber,
  //         subtotal,
  //         discountAmount,
  //         afterDiscount,
  //         taxAmount,
  //         total,
  //         paymentMethod: createPosOrderDto.paymentMethod,
  //         tenderedAmount: createPosOrderDto.tenderedAmount,
  //         change,
  //         status: savedOrder.status,
  //         createdAt: savedOrder.createdAt,
  //       };
  //     } catch (error) {
  //       await queryRunner.rollbackTransaction();
  //       throw error;
  //     } finally {
  //       await queryRunner.release();
  //     }
  //   }
  async createPosOrder(
    createPosOrderDto: CreatePosOrderDto,
    user: any,
  ): Promise<PosOrderResponseDto> {
    const userId = user?.id || null;
    const userName = user?.name || 'Utilisateur';
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Vérifier que la session est ouverte - CORRECTION ICI
      const session = await this.sessionsRepository.findOne({
        where: {
          id: createPosOrderDto.sessionId,
          status: SessionStatus.OPEN, // ← Utilisation de l'enum
        },
      });

      if (!session) {
        throw new BadRequestException(
          'Session de caisse non trouvée ou fermée',
        );
      }

      // 2. Calculer le sous-total depuis les prix en base
      const { items, subtotal } = await this.calculateItemsSubtotal(
        createPosOrderDto.items,
      );

      // 3. Calculer la remise
      let discountAmount = 0;
      if (createPosOrderDto.discountType && createPosOrderDto.discountValue) {
        if (createPosOrderDto.discountType === DiscountType.PERCENTAGE) {
          if (createPosOrderDto.discountValue > 100) {
            throw new BadRequestException(
              'Le pourcentage de remise ne peut pas dépasser 100%',
            );
          }
          discountAmount = Math.round(
            subtotal * (createPosOrderDto.discountValue / 100),
          );
        } else if (createPosOrderDto.discountType === DiscountType.FIXED) {
          if (createPosOrderDto.discountValue > subtotal) {
            throw new BadRequestException(
              'La remise fixe ne peut pas dépasser le sous-total',
            );
          }
          discountAmount = createPosOrderDto.discountValue;
        }
      }

      const afterDiscount = subtotal - discountAmount;

      // 4. Calculer la TVA (18% par défaut)
      const taxRate = 0.18;
      const taxAmount = Math.round(afterDiscount * taxRate);
      const total = afterDiscount + taxAmount;

      // 5. Vérifier le montant remis pour les espèces
      let change = 0;
      if (createPosOrderDto.paymentMethod === PaymentMethod.CASH) {
        if (!createPosOrderDto.tenderedAmount) {
          throw new BadRequestException(
            'Le montant remis est requis pour les paiements en espèces',
          );
        }
        if (createPosOrderDto.tenderedAmount < total) {
          throw new BadRequestException(
            `Montant insuffisant. Total: ${total}, remis: ${createPosOrderDto.tenderedAmount}`,
          );
        }
        change = createPosOrderDto.tenderedAmount - total;
      }

      // 6. Générer le numéro de commande
      const orderNumber = await this.generateOrderNumber('POS');

      // 7. Créer la commande
      const order = this.ordersRepository.create({
        orderNumber,
        subtotal,
        discountTotal: discountAmount,
        taxTotal: taxAmount,
        total,
        status: (createPosOrderDto.status as OrderStatus) || OrderStatus.COMPLETED,
        paymentStatus: (createPosOrderDto.paymentStatus as PaymentStatus) || PaymentStatus.PAID,
        paymentMethod: createPosOrderDto.paymentMethod,
        sessionId: createPosOrderDto.sessionId,
        userId,
        customerId: createPosOrderDto.customerId,
        notes: createPosOrderDto.notes,
        orderDate: new Date(),
      }) as Order;

      const savedOrder = await queryRunner.manager.save(order);
      const savedItems: any[] = [];

      // 8. Créer les items et décrémenter le stock
      for (const item of items) {
        const orderItem = this.orderItemsRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product.name,
          productSku: item.variant?.sku || item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          taxRate,
          taxAmount: Math.round(item.unitPrice * item.quantity * taxRate),
        });
        const savedItem = await queryRunner.manager.save(orderItem);
        savedItems.push(savedItem);

        // Décrémenter le stock et créer un mouvement
        if (item.variant) {
          await this.stockService.createMovement({
            productId: item.productId,
            type: StockMovementType.OUT,
            quantity: item.quantity,
            reason: `Vente POS #${orderNumber}`,
            reference: savedOrder.id,
            userId: userId,
          });
          item.variant.stock -= item.quantity;
          await queryRunner.manager.save(item.variant);
        } else {
          await this.stockService.createMovement({
            productId: item.productId,
            type: StockMovementType.OUT,
            quantity: item.quantity,
            reason: `Vente POS #${orderNumber}`,
            reference: savedOrder.id,
            userId: userId,
          });
        }
      }

      // 9. Mettre à jour la session de caisse
      session.salesCount += 1;
      session.salesTotal = Number(session.salesTotal) + total;
      if (createPosOrderDto.paymentMethod === PaymentMethod.CASH) {
        session.cashIn = Number(session.cashIn) + total;
      }

      // Mettre à jour les statistiques de paiement
      const paymentIndex = session.payments.findIndex(
        (p) => p.method === (createPosOrderDto.paymentMethod as string),
      );
      if (paymentIndex >= 0) {
        session.payments[paymentIndex].count += 1;
        session.payments[paymentIndex].total =
          Number(session.payments[paymentIndex].total) + total;
      } else {
        session.payments.push({
          method: createPosOrderDto.paymentMethod,
          count: 1,
          total: total,
        });
      }

      await queryRunner.manager.save(session);

      // 10. Audit log
      await this.auditService.log({
        userId,
        userName,
        action: AuditAction.SALE,
        resource: 'Order',
        resourceId: savedOrder.id,
        details: `Vente POS #${orderNumber} - Total: ${total} FCFA`,
        newData: savedOrder,
      });

      await queryRunner.commitTransaction();

      return {
        ...savedOrder,
        items: savedItems,
        discountAmount,
        afterDiscount,
        taxAmount,
        tenderedAmount: createPosOrderDto.tenderedAmount,
        change,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async create(createOrderDto: CreateOrderDto, user: any): Promise<Order> {
    const userId = user?.id || null;
    const userName = (user?.firstName && user?.lastName) ? `${user.firstName} ${user.lastName}` : (user?.name || 'Client');
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Calculate totals from DB unless explicitly provided (we still verify items exist)
      const { items, subtotal: calculatedSubtotal } = await this.calculateItemsSubtotal(
        createOrderDto.items,
      );

      // Use the calculated total if not provided
      const subtotal = createOrderDto.subtotal || calculatedSubtotal;
      const taxRate = 0.18; // Default
      const taxTotal = createOrderDto.taxTotal || Math.round(subtotal * taxRate);
      const discountTotal = createOrderDto.discountTotal || 0;
      const total = createOrderDto.total || (subtotal + taxTotal - discountTotal);

      // 2. Generate order number
      const prefix = createOrderDto.source === 'ecommerce' ? 'WEB' : 'CMD';
      const orderNumber = await this.generateOrderNumber(prefix);

      // 3. Create the order
      const order = this.ordersRepository.create({
        orderNumber,
        subtotal,
        discountTotal,
        taxTotal,
        total,
        status: (createOrderDto.status as OrderStatus) || OrderStatus.PENDING,
        paymentStatus: (createOrderDto.paymentStatus as PaymentStatus) || PaymentStatus.PENDING,
        paymentMethod: (createOrderDto.paymentMethod as any) || 'bank_transfer',
        userId: user?.role === 'customer' ? null : userId,
        customerId: createOrderDto.customerId || (user?.role === 'customer' ? user.id : null),
        customerName: createOrderDto.customerName || userName,
        customerEmail: createOrderDto.customerEmail || user?.email,
        shippingAddress: createOrderDto.shippingAddress,
        notes: createOrderDto.notes,
        orderDate: new Date(),
      }) as Order;

      const savedOrder = await queryRunner.manager.save(order);

      // 4. Create items and handle stock
      for (const item of items) {
        const orderItem = this.orderItemsRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product.name,
          productSku: item.variant?.sku || item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          taxRate,
          taxAmount: Math.round(item.unitPrice * item.quantity * taxRate),
        });
        await queryRunner.manager.save(orderItem);

        // Update stock movement
        await this.stockService.createMovement({
          productId: item.productId,
          type: StockMovementType.OUT,
          quantity: item.quantity,
          reason: `Commande ${createOrderDto.source || ''} #${orderNumber}`,
          reference: savedOrder.id,
          userId: userId,
        });
      }

      // 5. Audit log
      await this.auditService.log({
        userId,
        userName,
        action: AuditAction.SALE,
        resource: 'Order',
        resourceId: savedOrder.id,
        details: `Nouvelle commande ${createOrderDto.source || ''} #${orderNumber} - Total: ${total} FCFA`,
        newData: savedOrder,
      });

      await queryRunner.commitTransaction();
      return this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
    }
  }

  private async calculateItemsSubtotal(
    items: { productId: string; quantity: number; variantId?: string }[],
  ) {
    let subtotal = 0;
    const calculatedItems: Array<{
      productId: string;
      quantity: number;
      variantId?: string;
      product: Product;
      variant: ProductVariant | null;
      unitPrice: number;
    }> = [];

    for (const item of items) {
      const product = await this.productsRepository.findOne({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Produit ${item.productId} non trouvé`);
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Stock insuffisant pour ${product.name}. Disponible: ${product.stock}`,
        );
      }

      let unitPrice = product.price;
      let variant: ProductVariant | null = null;

      // Si c'est une variante
      if (item.variantId) {
        variant = await this.variantsRepository.findOne({
          where: { id: item.variantId, productId: item.productId },
        });

        if (!variant) {
          throw new NotFoundException(`Variante ${item.variantId} non trouvée`);
        }

        if (variant.stock < item.quantity) {
          throw new BadRequestException(
            `Stock insuffisant pour la variante ${variant.name}. Disponible: ${variant.stock}`,
          );
        }

        unitPrice = product.price + (variant.priceModifier || 0);
      }

      subtotal += unitPrice * item.quantity;

      calculatedItems.push({
        ...item,
        product,
        variant,
        unitPrice,
      });
    }

    return { items: calculatedItems, subtotal };
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    status?: OrderStatus,
    paymentStatus?: PaymentStatus,
    paymentMethod?: string,
    source?: string,
    customerId?: string,
    userId?: string,
    search?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<PaginatedResponse<Order>> {
    const qb = this.ordersRepository.createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('o.customer', 'customer')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('o.session', 'session');

    if (status && status !== 'all' as any) qb.andWhere('o.status = :status', { status });
    if (paymentStatus && paymentStatus !== 'all' as any) qb.andWhere('o.paymentStatus = :paymentStatus', { paymentStatus });
    if (paymentMethod && paymentMethod !== 'all' as any) qb.andWhere('o.paymentMethod = :paymentMethod', { paymentMethod });
    
    if (source && source !== 'all') {
      if (source === 'pos') {
        qb.andWhere('o.sessionId IS NOT NULL');
      } else if (source === 'ecommerce') {
        qb.andWhere('o.sessionId IS NULL');
      }
    }

    if (customerId) qb.andWhere('o.customerId = :customerId', { customerId });
    if (userId) qb.andWhere('o.userId = :userId', { userId });
    if (search) {
      qb.andWhere('(o.orderNumber LIKE :search OR o.customerName LIKE :search)', { search: `%${search}%` });
    }
    if (dateFrom) qb.andWhere('o.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('o.createdAt <= :dateTo', { dateTo });

    qb.orderBy('o.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    const [data, total] = await qb.getManyAndCount();

    return PaginatedResponseBuilder.build(data, total, page, pageSize);
  }

  async getStats(
    status?: OrderStatus,
    paymentStatus?: PaymentStatus,
    customerId?: string,
    userId?: string,
    search?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    const qb = this.ordersRepository.createQueryBuilder('o');

    if (status && (status as any) !== 'all') qb.andWhere('o.status = :status', { status });
    if (paymentStatus && (paymentStatus as any) !== 'all') qb.andWhere('o.paymentStatus = :paymentStatus', { paymentStatus });
    if (customerId) qb.andWhere('o.customerId = :customerId', { customerId });
    if (userId) qb.andWhere('o.userId = :userId', { userId });
    if (search) {
      qb.andWhere('(o.orderNumber LIKE :search OR o.customerName LIKE :search)', { search: `%${search}%` });
    }
    if (dateFrom) qb.andWhere('o.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('o.createdAt <= :dateTo', { dateTo });

    const totalOrders = await qb.clone().getCount();

    // Sum totals using a clone to preserve WHERE conditions
    const sumResult = await qb.clone().select('SUM(o.total)', 'revenue').getRawOne();
    const totalRevenue = parseFloat(sumResult?.revenue || '0');

    // Count pending
    const pendingOrders = await qb.clone()
      .andWhere('o.status IN (:...pendingStatuses)', { pendingStatuses: [OrderStatus.PENDING, OrderStatus.PROCESSING] })
      .getCount();

    // Sources breakdown: POS has a sessionId, E-commerce does not
    const posSales = await qb.clone().andWhere('o.sessionId IS NOT NULL').getCount();
    const ecomSales = await qb.clone().andWhere('o.sessionId IS NULL').getCount();

    return {
      totalOrders,
      totalRevenue,
      pendingOrders,
      posSales,
      ecomSales,
    };
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: ['items', 'customer', 'user', 'session', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException(`Commande avec l'ID ${id} non trouvée`);
    }

    return order;
  }

  async findRecent(limit: number = 10): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['items', 'customer', 'user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async trackOrder(orderNumber: string, emailOrPhone: string): Promise<Order> {
    const qb = this.ordersRepository.createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('o.items.product', 'product')
      .where('o.orderNumber = :orderNumber', { orderNumber });
      
    const order = await qb.getOne();

    if (!order) {
      throw new NotFoundException(`Commande introuvable`);
    }

    // Security check: matching email or phone
    const hasMatch = (order.customerEmail && order.customerEmail.toLowerCase() === emailOrPhone.toLowerCase()) || 
                     (order.customerPhone && order.customerPhone === emailOrPhone);
                     
    if (!hasMatch) {
      throw new BadRequestException('Les informations de contact ne correspondent pas à cette commande');
    }

    return order;
  }

  private async generateOrderNumber(prefix: string = 'CMD'): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    const count = await this.ordersRepository.count({
      where: {
        createdAt: Between(
          new Date(date.setHours(0, 0, 0, 0)),
          new Date(date.setHours(23, 59, 59, 999)),
        ),
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `${prefix}-${year}${month}${day}-${sequence}`;
  }
}
