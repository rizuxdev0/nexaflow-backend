import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Return } from './entities/return.entity';
import { CreateReturnDto, UpdateReturnStatusDto } from './dto/return.dto';

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(Return)
    private readonly returnRepository: Repository<Return>,
  ) {}

  async getAll(page: number = 1, pageSize: number = 20, status?: string) {
    const where = status ? { status } : {};
    const [data, total] = await this.returnRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getByCustomer(customerId: string) {
    return this.returnRepository.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }

  async create(createReturnDto: CreateReturnDto): Promise<Return> {
    // Generate return Number
    const year = new Date().getFullYear();
    const count = await this.returnRepository.count({
      where: { returnNumber: require('typeorm').Like(`RET-${year}%`) }
    });
    const returnNumber = `RET-${year}${String(count + 1).padStart(4, '0')}`;

    const ret = this.returnRepository.create({
      ...createReturnDto,
      returnNumber,
      status: 'pending',
    });
    
    return this.returnRepository.save(ret);
  }

  async updateStatus(id: string, updateDto: UpdateReturnStatusDto): Promise<Return> {
    const ret = await this.returnRepository.findOne({ where: { id } });
    if (!ret) throw new NotFoundException('Return request not found');

    const previousStatus = ret.status;
    const { status, processedBy } = updateDto;

    const validTransitions: Record<string, string[]> = {
      pending: ['approved', 'rejected'],
      approved: ['refunded', 'exchanged'],
      rejected: [],      // terminal
      refunded: [],       // terminal
      exchanged: [],      // terminal
    };

    if (!validTransitions[previousStatus]?.includes(status)) {
      throw new BadRequestException(`Transition invalide : ${previousStatus} -> ${status}`);
    }

    if ((status === 'approved' || status === 'refunded') && previousStatus === 'pending') {
      // TODO: Reintegre stock items
      // For each item in ret.items
      // if item.restockable === true -> Increment Stock
    }

    ret.status = status;
    if (processedBy) ret.processedBy = processedBy;
    if (['approved', 'rejected', 'refunded', 'exchanged'].includes(status)) {
      ret.processedAt = new Date();
    }

    return this.returnRepository.save(ret);
  }
}
