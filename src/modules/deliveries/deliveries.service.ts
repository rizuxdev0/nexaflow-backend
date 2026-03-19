import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Like, ArrayContains } from 'typeorm';
import { DeliveryZone } from './entities/delivery-zone.entity';
import { CreateDeliveryZoneDto, UpdateDeliveryZoneDto, CalculateShippingDto } from './dto/delivery.dto';

@Injectable()
export class DeliveriesService {
  constructor(
    @InjectRepository(DeliveryZone)
    private readonly zoneRepository: Repository<DeliveryZone>,
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
    // Need to find the zone where cities include the requested city.
    // In TypeORM with simple-array we can find all active zones and filter in memory, 
    // or use a specific query if supported. Since active zones aren't many usually, memory is fine or use ILike `%city%`.
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
      // For instance, weight > 1kg -> surcharge applies
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
}
