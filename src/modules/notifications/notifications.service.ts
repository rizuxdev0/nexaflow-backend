import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async findAll(query: { userId?: string; customerId?: string; isRead?: boolean; page?: number; pageSize?: number }) {
    const { userId, customerId, isRead, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (userId) where.userId = userId;
    if (customerId) where.customerId = customerId;
    if (isRead !== undefined) where.isRead = isRead;

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' }
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const notif = await this.notificationRepository.findOne({ where: { id } });
    if (!notif) throw new NotFoundException('Notification non trouvée');
    return notif;
  }

  async create(dto: CreateNotificationDto) {
    const notif = this.notificationRepository.create(dto);
    const saved = await this.notificationRepository.save(notif);
    
    // In real, should emit through WebSocket Gateway
    return saved;
  }

  async notifyLowStock(productName: string, sku: string, currentStock: number) {
    return this.create({
      type: NotificationType.STOCK,
      title: 'Alerte stock bas',
      message: `Le produit ${productName} (${sku}) est à ${currentStock} unités (Seuil atteint)`,
      link: `/admin/stock`, // UI link
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

  async markRead(id: string) {
    const notif = await this.findOne(id);
    notif.isRead = true;
    return this.notificationRepository.save(notif);
  }

  async markAllRead(userId?: string, customerId?: string) {
    const where: any = { isRead: false };
    if (userId) where.userId = userId;
    if (customerId) where.customerId = customerId;
    
    return this.notificationRepository.update(where, { isRead: true });
  }

  async remove(id: string) {
    const notif = await this.findOne(id);
    return this.notificationRepository.remove(notif);
  }
}
