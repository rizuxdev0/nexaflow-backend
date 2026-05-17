import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
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
import { ProductBundle } from '../packages/entities/package.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { calculateDistance } from '../../common/utils/geo.utils';
import { Vendor } from '../vendors/entities/vendor.entity';

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
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { LoyaltyService } from '../loyalty/loyalty.service';
import { CustomersService } from '../customers/customers.service';

import { CommissionService } from '../vendors/commission.service';
import { StoreConfigService } from '../store-config/store-config.service';
import { ChatGateway } from '../chat/chat.gateway';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class OrdersService extends AbstractTenantService<Order> {
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
    @InjectRepository(ProductBundle)
    private bundlesRepository: Repository<ProductBundle>,
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
    private dataSource: DataSource,
    private auditService: AuditService,
    private stockService: StockService,
    private notificationsService: NotificationsService,
    private loyaltyService: LoyaltyService,
    private customersService: CustomersService,
    private commissionService: CommissionService,
    private storeConfigService: StoreConfigService,
    tenantService: TenantService,
    @Inject(forwardRef(() => ChatGateway))
    private chatGateway: ChatGateway,
  ) {
    super(ordersRepository, tenantService, 'Order');
  }

  // Proxied secondary repositories
  private get orderItemsRepo() { return this.tenantRepo(this.orderItemsRepository); }
  private get productsRepo() { return this.tenantRepo(this.productsRepository); }
  private get variantsRepo() { return this.tenantRepo(this.variantsRepository); }
  private get sessionsRepo() { return this.tenantRepo(this.sessionsRepository); }
  private get bundlesRepo() { return this.tenantRepo(this.bundlesRepository); }
  private get warehouseRepo() { return this.tenantRepo(this.warehouseRepository); }

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
      const session = await this.sessionsRepo.findOne({
        where: {
          id: createPosOrderDto.sessionId,
          status: SessionStatus.OPEN,
        },
      });

      if (!session) {
        throw new BadRequestException('Session de caisse non trouvée ou fermée');
      }

      const { items, subtotal } = await this.calculateItemsSubtotal(createPosOrderDto.items);

      let discountAmount = createPosOrderDto.discountTotal || 0;
      if (!discountAmount && createPosOrderDto.discountType && createPosOrderDto.discountValue) {
        if (createPosOrderDto.discountType === DiscountType.PERCENTAGE) {
          discountAmount = Math.round(subtotal * (createPosOrderDto.discountValue / 100));
        } else if (createPosOrderDto.discountType === DiscountType.FIXED) {
          discountAmount = createPosOrderDto.discountValue;
        }
      }

      const afterDiscount = subtotal - discountAmount;
      const config = await this.storeConfigService.get();
      const currentTaxRate = (config.checkout.tax.defaultTaxRate || 18) / 100;
      const pricesIncludeTax = config.checkout.tax.pricesIncludeTax === true;
      
      let taxAmount = 0;
      let total = 0;

      if (pricesIncludeTax) {
        total = afterDiscount;
        taxAmount = Math.round(total - (total / (1 + currentTaxRate)));
      } else {
        taxAmount = Math.round(afterDiscount * currentTaxRate);
        total = afterDiscount + taxAmount;
      }

      if (createPosOrderDto.paymentMethod === PaymentMethod.CASH) {
        if (!createPosOrderDto.tenderedAmount || createPosOrderDto.tenderedAmount < total) {
          throw new BadRequestException(`Montant insuffisant. Total: ${total}`);
        }
      }

      const orderNumber = await this.generateOrderNumber('POS');

      const order = this.repo.create({
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
        promoCode: createPosOrderDto.promoCode,
        vendorId: this.tenantService.getVendorId() || undefined,
        statusHistory: [{ status: createPosOrderDto.status || OrderStatus.COMPLETED, timestamp: new Date() }],
      }) as Order;

      const savedOrder = await queryRunner.manager.save(order);
      const savedItems: any[] = [];

      for (const item of items) {
        const commission = await this.commissionService.calculateCommission(
          item.product.vendorId,
          item.product.categoryId,
          item.unitPrice * item.quantity
        );

        const orderItem = this.orderItemsRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product.name,
          productSku: item.variant?.sku || item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          taxRate: currentTaxRate,
          taxAmount: pricesIncludeTax 
            ? Math.round((item.unitPrice * item.quantity) - ((item.unitPrice * item.quantity) / (1 + currentTaxRate)))
            : Math.round(item.unitPrice * item.quantity * currentTaxRate),
          commissionRate: commission.rate,
          commissionAmount: commission.amount,
        });
        const savedItem = await queryRunner.manager.save(orderItem);
        savedItems.push(savedItem);

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
        } else if ((item as any).isBundle) {
          const bundle = await this.bundlesRepo.findOne({ where: { id: item.productId } });
          if (bundle) {
            bundle.stock -= item.quantity;
            await queryRunner.manager.save(bundle);
          }
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

      session.salesCount += 1;
      session.salesTotal = Number(session.salesTotal) + total;
      if (createPosOrderDto.paymentMethod === PaymentMethod.CASH) {
        session.cashIn = Number(session.cashIn) + total;
      }

      const paymentIndex = session.payments.findIndex((p) => p.method === (createPosOrderDto.paymentMethod as string));
      if (paymentIndex >= 0) {
        session.payments[paymentIndex].count += 1;
        session.payments[paymentIndex].total = Number(session.payments[paymentIndex].total) + total;
      } else {
        session.payments.push({ method: createPosOrderDto.paymentMethod, count: 1, total: total });
      }

      await queryRunner.manager.save(session);

      await this.auditService.log({
        userId,
        userName,
        action: AuditAction.SALE,
        resource: 'Order',
        resourceId: savedOrder.id,
        details: `Vente POS #${orderNumber} - Total: ${total} FCFA`,
        newData: savedOrder,
      });

      await this.notificationsService.create({
        type: NotificationType.ORDER,
        userId: userId,
        title: 'Nouvelle vente POS',
        message: `Une nouvelle commande POS #${orderNumber} a été finalisée (${total} FCFA)`,
        link: `/admin/orders`
      });

      this.chatGateway.emitNewOrder(savedOrder);
      await this.processLoyalty(savedOrder);
      await queryRunner.commitTransaction();

      return {
        ...savedOrder,
        items: savedItems,
        discountAmount,
        afterDiscount,
        taxAmount,
        tenderedAmount: createPosOrderDto.tenderedAmount,
        change: (createPosOrderDto.tenderedAmount || 0) - total,
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
      const { items, subtotal: calculatedSubtotal } = await this.calculateItemsSubtotal(createOrderDto.items);
      const config = await this.storeConfigService.get();
      const defaultTaxRate = (config.checkout.tax.defaultTaxRate || 18) / 100;
      const pricesIncludeTax = config.checkout.tax.pricesIncludeTax === true;

      const subtotal = createOrderDto.subtotal || calculatedSubtotal;
      let taxTotal = 0;
      let total = 0;
      const discountTotal = createOrderDto.discountTotal || 0;
      const afterDiscount = subtotal - discountTotal;

      if (pricesIncludeTax) {
        total = createOrderDto.total || afterDiscount;
        taxTotal = createOrderDto.taxTotal || Math.round(total - (total / (1 + defaultTaxRate)));
      } else {
        taxTotal = createOrderDto.taxTotal || Math.round(afterDiscount * defaultTaxRate);
        total = createOrderDto.total || (afterDiscount + taxTotal);
      }

      const prefix = createOrderDto.source === 'ecommerce' ? 'WEB' : 'CMD';
      const orderNumber = await this.generateOrderNumber(prefix);

      const order = this.repo.create({
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
        shippingLatitude: createOrderDto.shippingLatitude,
        shippingLongitude: createOrderDto.shippingLongitude,
        notes: createOrderDto.notes,
        orderDate: new Date(),
        promoCode: createOrderDto.promoCode,
        vendorId: this.tenantService.getVendorId() || undefined,
        statusHistory: [{ status: createOrderDto.status || OrderStatus.PENDING, timestamp: new Date() }],
      }) as Order;

      const savedOrder = await queryRunner.manager.save(order);

      for (const item of items) {
        const commission = await this.commissionService.calculateCommission(
          item.product.vendorId,
          item.product.categoryId,
          item.unitPrice * item.quantity
        );

        const orderItem = this.orderItemsRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product.name,
          productSku: item.variant?.sku || item.product.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          taxRate: defaultTaxRate,
          taxAmount: pricesIncludeTax
            ? Math.round((item.unitPrice * item.quantity) - ((item.unitPrice * item.quantity) / (1 + defaultTaxRate)))
            : Math.round(item.unitPrice * item.quantity * defaultTaxRate),
          commissionRate: commission.rate,
          commissionAmount: commission.amount,
        });
        await queryRunner.manager.save(orderItem);

        await this.stockService.createMovement({
          productId: item.productId,
          type: StockMovementType.OUT,
          quantity: item.quantity,
          reason: `Commande ${createOrderDto.source || ''} #${orderNumber}`,
          reference: savedOrder.id,
          userId: userId,
        });
      }

      await this.auditService.log({
        userId,
        userName,
        action: AuditAction.SALE,
        resource: 'Order',
        resourceId: savedOrder.id,
        details: `Nouvelle commande ${createOrderDto.source || ''} #${orderNumber} - Total: ${total} FCFA`,
        newData: savedOrder,
      });

      await this.notificationsService.create({
        type: NotificationType.ORDER,
        title: 'Nouvelle commande e-commerce',
        message: `Une commande #${savedOrder.orderNumber} vient d'être reçue de la part de ${savedOrder.customerName}`,
        link: `/admin/orders`
      });

      this.chatGateway.emitNewOrder(savedOrder);
      await this.processLoyalty(savedOrder);
      await queryRunner.commitTransaction();
      return this.findOne(savedOrder.id);
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
    const calculatedItems: any[] = [];

    for (const item of (items as any[])) {
      let product: any = null;
      let variant: ProductVariant | null = null;
      let unitPrice = 0;

      if (item.isBundle) {
        product = await this.bundlesRepo.findOne({ where: { id: item.productId } });
        if (!product) throw new NotFoundException(`Pack ${item.productId} non trouvé`);
        unitPrice = Number(product.bundlePrice);
      } else {
        product = await this.productsRepo.findOne({ where: { id: item.productId } });
        if (!product) throw new NotFoundException(`Produit ${item.productId} non trouvé`);
        unitPrice = Number(product.price);

        if (item.variantId) {
          variant = await this.variantsRepo.findOne({ where: { id: item.variantId, productId: item.productId } });
          if (!variant) throw new NotFoundException(`Variante ${item.variantId} non trouvée`);
          unitPrice = Number(product.price) + Number(variant.priceModifier || 0);
        }
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(`Stock insuffisant pour ${product.name}. Disponible: ${product.stock}`);
      }

      subtotal += unitPrice * item.quantity;
      calculatedItems.push({ ...item, product, variant, unitPrice });
    }

    return { items: calculatedItems, subtotal };
  }

  async finalizeVendorCommissions(orderId: string) {
    const order = await this.repo.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product']
    });

    if (!order || order.status !== OrderStatus.COMPLETED) return;

    for (const item of order.items) {
      if (item.productId && item.commissionAmount > 0) {
        const product = await this.productsRepo.findOne({ where: { id: item.productId } });
        if (product && product.vendorId) {
          const vendorRepo = this.dataSource.getRepository(Vendor);
          const vendor = await vendorRepo.findOne({ where: { id: product.vendorId } });
          if (vendor) {
            const netAmount = Number(item.totalPrice) - Number(item.commissionAmount);
            vendor.balance = Number(vendor.balance) + netAmount;
            vendor.totalRevenue = Number(vendor.totalRevenue) + netAmount;
            vendor.totalCommission = Number(vendor.totalCommission) + Number(item.commissionAmount);
            vendor.totalOrders += 1;
            await vendorRepo.save(vendor);
          }
        }
      }
    }
  }

  private async processLoyalty(order: Order) {
    if (order.customerId && order.paymentStatus === PaymentStatus.PAID) {
      try {
        const alreadyEarned = await this.loyaltyService.hasEarnedPoints(order.id);
        if (alreadyEarned) return;

        await this.customersService.updateCustomerStats(order.customerId, order.total);
        const points = await this.loyaltyService.calculateEarnedPoints(order.customerId, order.total);
        if (points > 0) {
          await this.loyaltyService.earnPoints({ customerId: order.customerId, points, orderId: order.id });
        }
      } catch (error) {
        console.error(`Loyalty error [Order ${order.id}]:`, error);
      }
    }
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
    const qb = this.repo.createQueryBuilder('o')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('o.customer', 'customer')
      .leftJoinAndSelect('o.user', 'user')
      .leftJoinAndSelect('o.session', 'session');

    if (status && status !== 'all' as any) qb.andWhere('o.status = :status', { status });
    if (paymentStatus && paymentStatus !== 'all' as any) qb.andWhere('o.paymentStatus = :paymentStatus', { paymentStatus });
    if (paymentMethod && paymentMethod !== 'all' as any) qb.andWhere('o.paymentMethod = :paymentMethod', { paymentMethod });
    
    if (source && source !== 'all') {
      if (source === 'pos') qb.andWhere('o.sessionId IS NOT NULL');
      else if (source === 'ecommerce') qb.andWhere('o.sessionId IS NULL');
    }

    if (customerId) qb.andWhere('o.customerId = :customerId', { customerId });
    if (userId) qb.andWhere('o.userId = :userId', { userId });
    if (search) qb.andWhere('(o.orderNumber LIKE :search OR o.customerName LIKE :search)', { search: `%${search}%` });
    if (dateFrom) qb.andWhere('o.createdAt >= :dateFrom', { dateFrom });
    if (dateTo) qb.andWhere('o.createdAt <= :dateTo', { dateTo });

    qb.orderBy('o.createdAt', 'DESC').skip((page - 1) * pageSize).take(pageSize);
    const [data, total] = await qb.getManyAndCount();
    return PaginatedResponseBuilder.build(data, total, page, pageSize);
  }
  async getStats(
    status?: OrderStatus,
    paymentStatus?: PaymentStatus,
    paymentMethod?: string,
    source?: string,
    customerId?: string,
    userId?: string,
    search?: string,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    const vendorId = this.tenantService.getVendorId();
    const qb = this.ordersRepository.createQueryBuilder('o');

    if (vendorId) {
      qb.andWhere('o.vendorId = :vendorId', { vendorId });
    }

    if (status && (status as any) !== 'all') qb.andWhere('o.status = :status', { status });
    if (paymentStatus && (paymentStatus as any) !== 'all') qb.andWhere('o.paymentStatus = :paymentStatus', { paymentStatus });
    if (paymentMethod && paymentMethod !== 'all') qb.andWhere('o.paymentMethod = :paymentMethod', { paymentMethod });
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



  async findRecent(limit: number = 10): Promise<Order[]> {
    const vendorId = this.tenantService.getVendorId();
    return this.ordersRepository.find({
      where: { vendorId: vendorId || undefined },
      relations: ['items', 'customer', 'user'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  private getStatusRank(status: OrderStatus): number {
    const ranks = {
      [OrderStatus.DRAFT]: 0,
      [OrderStatus.PENDING]: 1,
      [OrderStatus.CONFIRMED]: 2,
      [OrderStatus.PROCESSING]: 3,
      [OrderStatus.SHIPPED]: 4,
      [OrderStatus.DELIVERED]: 5,
      [OrderStatus.COMPLETED]: 6,
      [OrderStatus.CANCELLED]: 99,
      [OrderStatus.REFUNDED]: 100,
    };
    return (ranks as any)[status] || 0;
  }

  async updateStatus(id: string, status: OrderStatus, user: any): Promise<Order> {
    const userId = user?.id || null;
    const userName = user?.name || 'Utilisateur';
    const order = await this.findOne(id);
    const previousStatus = order.status;

    // Vérification de la progression (interdire de revenir en arrière)
    const currentRank = this.getStatusRank(previousStatus);
    const newRank = this.getStatusRank(status);

    // Si on essaie de revenir en arrière (sauf vers Annulé/Remboursé si pas déjà au bout)
    if (newRank < currentRank && status !== OrderStatus.CANCELLED && status !== OrderStatus.REFUNDED) {
      throw new BadRequestException(
        `Impossible de passer de '${previousStatus}' à '${status}'. On ne peut pas revenir en arrière dans les étapes.`,
      );
    }

    // Interdire de modifier une commande déjà annulée ou terminée (sauf remboursement)
    if (
      (previousStatus === OrderStatus.CANCELLED || previousStatus === OrderStatus.COMPLETED) &&
      status !== OrderStatus.REFUNDED
    ) {
      const msg = previousStatus === OrderStatus.CANCELLED ? 'annulée' : 'terminée';
      throw new BadRequestException(
        `La commande est déjà ${msg} et ne peut plus être modifiée (sauf remboursement).`,
      );
    }

    order.status = status;
    
    // Enregistrement de l'historique
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({ status, timestamp: new Date() });
    
    // Automatisation de certains états de paiement
    if (status === OrderStatus.COMPLETED || status === OrderStatus.DELIVERED) {
      if (order.paymentStatus !== PaymentStatus.PAID) {
        order.paymentStatus = PaymentStatus.PAID;
        order.paidAt = new Date();
      }
    }

    const saved = await this.ordersRepository.save(order);

    // MARKETPLACE: Finalize vendor commissions if completed
    if (status === OrderStatus.COMPLETED) {
      await this.finalizeVendorCommissions(id);
    }

    // FIDÉLITÉ: Gain de points si paiement complété
    await this.processLoyalty(saved);

    await this.auditService.log({
      userId,
      userName,
      action: AuditAction.UPDATE,
      resource: 'Order',
      resourceId: id,
      details: `Statut commande ${order.orderNumber} modifié: ${previousStatus} → ${status}`,
      oldData: { status: previousStatus },
      newData: { status },
    });

    // Notification changement statut (Client et Admin)
    await this.notificationsService.notifyOrderUpdate(
      order.id,
      order.orderNumber,
      status,
      order.customerId,
      order.userId
    );

    return saved;
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

  async findOne(id: string): Promise<Order> {
    return super.findOne(id, ['items', 'items.product', 'customer', 'user', 'session']);
  }



  async updatePaymentStatus(id: string, paymentStatus: PaymentStatus): Promise<Order> {
    const order = await this.findOne(id);
    const oldStatus = order.paymentStatus;
    order.paymentStatus = paymentStatus;
    const savedOrder = await this.repo.save(order);

    if (paymentStatus === PaymentStatus.PAID && oldStatus !== PaymentStatus.PAID) {
      await this.processLoyalty(savedOrder);
    }

    return savedOrder;
  }

  private async generateOrderNumber(prefix: string): Promise<string> {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const count = await this.repo.count({
      where: {
        createdAt: Between(
          new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59)
        )
      }
    });

    return `${prefix}${year}${month}${day}-${(count + 1).toString().padStart(4, '0')}`;
  }

  async getGlobalStats() {
    const [total, pending, completed, cancelled] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { status: OrderStatus.PENDING } }),
      this.repo.count({ where: { status: OrderStatus.COMPLETED } }),
      this.repo.count({ where: { status: OrderStatus.CANCELLED } }),
    ]);

    const revenueResult = await this.repo.createQueryBuilder('o')
      .select('SUM(o.total)', 'total')
      .where('o.status = :status', { status: OrderStatus.COMPLETED })
      .getRawOne();

    const ordersByMethod = await this.repo.createQueryBuilder('o')
      .select('o.paymentMethod', 'method')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.paymentMethod')
      .getRawMany();

    return {
      total,
      pending,
      completed,
      cancelled,
      totalRevenue: Number(revenueResult?.total || 0),
      ordersByMethod,
    };
  }

  async crossSearch(boughtProductId: string, notBoughtProductId: string): Promise<any[]> {
    const buyersOfA = await this.orderItemsRepo.createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoinAndSelect('o.customer', 'c')
      .select(['DISTINCT c.id', 'c.firstName', 'c.lastName', 'c.email', 'c.phone', 'c.totalSpent', 'c.totalOrders', 'c.loyaltyPoints'])
      .where('oi.productId = :pidA', { pidA: boughtProductId })
      .andWhere('o.customerId IS NOT NULL')
      .getRawMany();

    if (buyersOfA.length === 0) return [];

    const idsOfA = buyersOfA.map(b => b.c_id);

    const buyersOfBoth = await this.orderItemsRepo.createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .select('DISTINCT o.customerId', 'customerId')
      .where('oi.productId = :pidB', { pidB: notBoughtProductId })
      .andWhere('o.customerId IN (:...ids)', { ids: idsOfA })
      .getRawMany();

    const idsOfBoth = new Set(buyersOfBoth.map(b => b.customerId));

    return buyersOfA
      .filter(b => !idsOfBoth.has(b.c_id))
      .map(b => ({
        id: b.c_id,
        firstName: b.c_firstName,
        lastName: b.c_lastName,
        email: b.c_email,
        phone: b.c_phone,
        totalSpent: parseFloat(b.c_totalSpent),
        totalOrders: parseInt(b.c_totalOrders),
        loyaltyPoints: parseInt(b.c_loyaltyPoints),
      }));
  }

  async recommendWarehouses(lat: number, lon: number, limit: number = 3): Promise<any[]> {
    const warehouses = await this.warehouseRepo.find({
      where: { isActive: true },
    });

    return warehouses
      .map(w => {
        const distance = calculateDistance(
          lat,
          lon,
          Number(w.latitude),
          Number(w.longitude)
        );
        return {
          id: w.id,
          name: w.name,
          code: w.code,
          address: w.address,
          city: w.city,
          distance,
        };
      })
      .filter(w => w.distance !== Infinity)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
  }
}
