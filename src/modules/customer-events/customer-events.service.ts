import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerEvent } from './entities/customer-event.entity';

@Injectable()
export class CustomerEventsService {
  constructor(
    @InjectRepository(CustomerEvent)
    private eventRepository: Repository<CustomerEvent>,
  ) {}

  async log(data: Partial<CustomerEvent>): Promise<CustomerEvent> {
    const entry = this.eventRepository.create(data);
    return await this.eventRepository.save(entry);
  }

  async findAll(page = 1, pageSize = 50, filters: any = {}): Promise<any> {
    const query = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.customer', 'customer')
      .orderBy('event.timestamp', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filters.event) {
      query.andWhere('event.event = :event', { event: filters.event });
    }
    if (filters.customerId) {
      query.andWhere('event.customerId = :customerId', { customerId: filters.customerId });
    }

    const [data, total] = await query.getManyAndCount();
    return { data, total, page, pageSize };
  }

  async getStats() {
    const total = await this.eventRepository.count();
    
    // Most active events
    const byEvent = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.event', 'event')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.event')
      .orderBy('count', 'DESC')
      .getRawMany();

    return { total, byEvent };
  }
}
