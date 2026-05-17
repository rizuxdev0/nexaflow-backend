import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/notification.dto';
import { TenantService } from '../../common/tenant/tenant.service';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly tenantService: TenantService,
  ) {}

  private get repo() { return this.tenantService.tenantRepo(this.notificationRepository); }

  async findAll(query: { userId?: string; customerId?: string; isRead?: boolean; page?: number; pageSize?: number }, isAdmin = false) {
    const { userId, customerId, isRead, page = 1, pageSize = 20 } = query;
    const where: any = {};
    
    if (!isAdmin) {
      if (!customerId) return { data: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };
      where.customerId = customerId;
    } else if (customerId) {
      where.customerId = customerId;
    } else if (userId) {
      where.userId = userId;
    }

    if (isRead !== undefined) where.isRead = isRead;

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' }
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const notif = await this.repo.findOne({ where: { id } });
    if (!notif) throw new NotFoundException('Notification non trouvée');
    return notif;
  }

  async create(dto: CreateNotificationDto) {
    const notif = this.repo.create({
      ...dto,
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    const saved = await this.repo.save(notif);
    return saved;
  }

  async notifyLowStock(productName: string, sku: string, currentStock: number) {
    return this.create({
      type: NotificationType.STOCK,
      title: 'Alerte stock bas',
      message: `Le produit ${productName} (${sku}) est à ${currentStock} unités (Seuil atteint)`,
      link: `/admin/stock`,
    });
  }

  async notifyOrderUpdate(orderId: string, orderNumber: string, status: string, customerId?: string, userId?: string) {
    return this.create({
      type: NotificationType.ORDER,
      customerId,
      userId,
      title: 'Mise à jour de commande',
      message: `La commande ${orderNumber} est désormais ${status}`,
      link: `/admin/orders`,
      metadata: { orderId, orderNumber, status }
    });
  }

  async notifyCustomPackUpdate(packId: string, customerName: string, status: string, customerId?: string, userId?: string) {
    const isNew = status === 'pending';
    return this.create({
      type: NotificationType.PACK, 
      customerId,
      userId,
      title: isNew ? 'Nouvelle demande de pack' : 'Statut de votre pack',
      message: isNew 
        ? `Une nouvelle demande de pack personnalisé a été soumise par ${customerName}`
        : `Votre demande de pack personnalisé a été ${status === 'approved' ? 'approuvée' : 'refusée'}`,
      link: isNew ? `/admin/stock?tab=packs` : `/boutique/profil?tab=packs`,
      metadata: { packId, status, isCustomer: !isNew }
    });
  }

  async notifyVendorRequest(requestId: string, storeName: string, customerName: string) {
    return this.create({
      type: NotificationType.VENDOR_REQUEST,
      title: 'Nouvelle demande vendeur',
      message: `${customerName} souhaite devenir vendeur pour la boutique "${storeName}"`,
      link: '/admin/marketplace?tab=requests',
      metadata: { requestId, storeName, customerName }
    });
  }

  async notifyDeliveryUpdate(orderNumber: string, status: string, driverName?: string, customerId?: string) {
    const statusText = status === 'assigned' ? `assignée à ${driverName}` : status;
    return this.create({
      type: NotificationType.DELIVERY,
      customerId,
      title: 'Suivi de livraison',
      message: `Votre commande ${orderNumber} est ${statusText}`,
      link: `/boutique/profil?tab=orders`,
      metadata: { orderNumber, status, driverName }
    });
  }

  async markRead(id: string) {
    const notif = await this.findOne(id);
    notif.isRead = true;
    return this.repo.save(notif);
  }

  async markAllRead(userId?: string, customerId?: string) {
    const qb = this.repo.createQueryBuilder()
      .update(Notification)
      .set({ isRead: true })
      .where('isRead = :isRead', { isRead: false });

    if (customerId) {
       qb.andWhere('customerId = :customerId', { customerId });
    } else if (userId) {
       qb.andWhere('(userId = :userId OR userId IS NULL)', { userId });
       qb.andWhere('customerId IS NULL');
    } else {
       qb.andWhere('customerId IS NULL');
    }

    return qb.execute();
  }

  async remove(id: string) {
    const notif = await this.findOne(id);
    return this.repo.remove(notif);
  }
}
