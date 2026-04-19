import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, ArrayContains } from 'typeorm';
import { Driver } from './entities/driver.entity';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { Order, OrderStatus, DeliveryStatus } from '../orders/entities/order.entity';
import { CreateDeliveryZoneDto, UpdateDeliveryZoneDto, CalculateShippingDto } from './dto/delivery.dto';
import { CreateDriverDto, UpdateDriverDto, AssignDeliveryDto, UpdateDeliveryStatusDto, UpdateDriverLocationDto } from './dto/driver.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(DeliveryZone)
    private readonly zoneRepository: Repository<DeliveryZone>,
    @InjectRepository(Driver)
    private readonly driverRepository: Repository<Driver>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getZones(page: number = 1, pageSize: number = 20) {
    const [data, total] = await this.zoneRepository.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' }
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getAllZones() {
    return this.zoneRepository.find({
      order: { name: 'ASC' }
    });
  }

  async createZone(dto: CreateDeliveryZoneDto): Promise<DeliveryZone> {
    const zone = this.zoneRepository.create(dto);
    return this.zoneRepository.save(zone);
  }

  async updateZone(id: string, dto: UpdateDeliveryZoneDto): Promise<DeliveryZone> {
    const zone = await this.zoneRepository.findOne({ where: { id } });
    if (!zone) throw new NotFoundException('Zone non trouvée');
    Object.assign(zone, dto);
    return this.zoneRepository.save(zone);
  }

  async deleteZone(id: string): Promise<void> {
    const zone = await this.zoneRepository.findOne({ where: { id } });
    if (!zone) throw new NotFoundException('Zone non trouvée');
    await this.zoneRepository.remove(zone);
  }

  // --- Core Calculation ---
  async calculateShipping(dto: CalculateShippingDto) {
    const zones = await this.zoneRepository.find({ where: { isActive: true } });
    const zone = zones.find(z => z.cities.map(c => c.toLowerCase()).includes(dto.city.toLowerCase()));

    if (!zone) {
      return null;
    }

    let isFree = false;
    let fee = Number(zone.baseFee);

    if (zone.freeAbove && dto.orderTotal >= zone.freeAbove) {
      isFree = true;
      fee = 0;
    } else if (zone.weightSurcharge && dto.totalWeight && dto.totalWeight > 0) {
      fee += Number(zone.weightSurcharge) * dto.totalWeight;
    }

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      fee,
      isFree,
      estimatedDays: zone.estimatedDays
    };
  }

  // --- Driver Management ---
  async getDrivers(page: number = 1, pageSize: number = 20) {
    const [data, total] = await this.driverRepository.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { name: 'ASC' }
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createDriver(dto: CreateDriverDto) {
    const driver = this.driverRepository.create(dto);
    return this.driverRepository.save(driver);
  }

  async updateDriver(id: string, dto: UpdateDriverDto) {
    await this.driverRepository.update(id, dto);
    return this.driverRepository.findOne({ where: { id } });
  }

  async deleteDriver(id: string) {
    return this.driverRepository.delete(id);
  }

  // --- Delivery Assignments ---
  async assignDelivery(dto: AssignDeliveryDto) {
    const order = await this.orderRepository.findOne({ where: { id: dto.orderId } });
    const driver = await this.driverRepository.findOne({ where: { id: dto.driverId } });

    if (!order || !driver) throw new NotFoundException('Commande ou Livreur non trouvé');

    order.driverId = driver.id;
    order.deliveryStatus = DeliveryStatus.ASSIGNED;
    const savedOrder = await this.orderRepository.save(order);
    
    await this.notificationsService.notifyDeliveryUpdate(
      order.orderNumber, 
      'assigned', 
      driver.name, 
      order.customerId
    );
    
    return savedOrder;
  }

  async updateDeliveryStatus(orderId: string, dto: UpdateDeliveryStatusDto) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Commande non trouvée');

    order.deliveryStatus = dto.status as any;
    if (dto.status === 'delivered') {
      order.deliveredAt = new Date();
      order.status = OrderStatus.DELIVERED;
    }
    if (dto.notes) order.notes = (order.notes || '') + '\n' + dto.notes;

    const savedOrder = await this.orderRepository.save(order);
    
    await this.notificationsService.notifyDeliveryUpdate(
      order.orderNumber, 
      dto.status, 
      undefined, 
      order.customerId
    );
    
    return savedOrder;
  }

  async getPendingDeliveries() {
    return this.orderRepository.find({
      where: { deliveryStatus: DeliveryStatus.PENDING },
      relations: ['customer']
    });
  }

  async getActiveDeliveries() {
    return this.orderRepository.find({
      where: { 
        deliveryStatus: In(['assigned', 'picked_up', 'out_for_delivery'] as any) 
      },
      relations: ['customer', 'driver']
    });
  }

  async updateLocation(dto: UpdateDriverLocationDto) {
    const driver = await this.driverRepository.findOne({ where: { id: dto.driverId } });
    if (!driver) throw new NotFoundException('Livreur non trouvé');

    driver.latitude = parseFloat(dto.latitude);
    driver.longitude = parseFloat(dto.longitude);
    driver.lastLocationUpdate = new Date();

    return this.driverRepository.save(driver);
  }
}
