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
    userId: string,
  ): Promise<PosOrderResponseDto> {
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
        discountTotal: discountAmount, // ← Utiliser discountTotal (nom de la colonne dans l'entité)
        taxTotal: taxAmount,
        total,
        status: OrderStatus.COMPLETED,
        paymentStatus: PaymentStatus.PAID,
        paymentMethod: createPosOrderDto.paymentMethod,
        sessionId: createPosOrderDto.sessionId,
        userId, // ← Correspond à votre entité Order qui a userId
        customerId: createPosOrderDto.customerId,
        notes: createPosOrderDto.notes,
        orderDate: new Date(),
      });

      const savedOrder = await queryRunner.manager.save(order);

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
        await queryRunner.manager.save(orderItem);

        // Décrémenter le stock
        if (item.variant) {
          item.variant.stock -= item.quantity;
          await queryRunner.manager.save(item.variant);
        } else {
          item.product.stock -= item.quantity;
          await queryRunner.manager.save(item.product);
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
        userName: 'Utilisateur', // À remplacer par le vrai nom
        action: AuditAction.SALE,
        resource: 'Order',
        resourceId: savedOrder.id,
        details: `Vente POS #${orderNumber} - Total: ${total} FCFA`,
        newData: savedOrder,
      });

      await queryRunner.commitTransaction();

      return {
        id: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        subtotal,
        discountAmount,
        afterDiscount,
        taxAmount,
        total,
        paymentMethod: createPosOrderDto.paymentMethod,
        tenderedAmount: createPosOrderDto.tenderedAmount,
        change,
        status: savedOrder.status,
        createdAt: savedOrder.createdAt,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
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
