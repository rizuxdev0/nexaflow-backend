import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { CreateWarehouseDto, UpdateWarehouseDto } from './dto/warehouse.dto';
import { Branch } from '../branches/entities/branch.entity';

@Injectable()
export class WarehousesService {
  constructor(
    @InjectRepository(Warehouse)
    private readonly warehouseRepository: Repository<Warehouse>,
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async findAll(query: { branchId?: string; page?: number; pageSize?: number }) {
    const { branchId, page = 1, pageSize = 20 } = query;
    const where: any = {};
    if (branchId) where.branchId = branchId;

    const [data, total] = await this.warehouseRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      relations: ['branch'],
      order: { name: 'ASC' }
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(id: string) {
    const wh = await this.warehouseRepository.findOne({ 
      where: { id },
      relations: ['branch']
    });
    if (!wh) throw new NotFoundException('Warehouse not found');
    return wh;
  }

  async create(dto: CreateWarehouseDto) {
    const branch = await this.branchRepository.findOne({ where: { id: dto.branchId } });
    if (!branch) throw new NotFoundException('Branch not found');

    const wh = this.warehouseRepository.create(dto);
    return this.warehouseRepository.save(wh);
  }

  async update(id: string, dto: UpdateWarehouseDto) {
    const wh = await this.findOne(id);
    Object.assign(wh, dto);
    return this.warehouseRepository.save(wh);
  }

  async remove(id: string) {
    const wh = await this.findOne(id);
    return this.warehouseRepository.remove(wh);
  }
}
