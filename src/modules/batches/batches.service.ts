import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, In } from 'typeorm';
import { ProductBatch, BatchStatus } from './entities/batch.entity';
import { CreateBatchDto, UpdateBatchStatusDto, ConsumeBatchDto, SplitBatchDto, TransferBatchDto, QualityCheckDto } from './dto/batch.dto';
import { Product } from '../products/entities/product.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';


@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(ProductBatch)
    private readonly batchRepository: Repository<ProductBatch>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
    private readonly auditService: AuditService,
  ) {}

  async findAll(query: { page?: number; pageSize?: number; status?: string; warehouseId?: string, productId?: string }) {
    const { page = 1, pageSize = 20, status, warehouseId, productId } = query;
    const where: any = {};
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;

    const [data, total] = await this.batchRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
      relations: ['product', 'warehouse', 'supplier']
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const batch = await this.batchRepository.findOne({ 
      where: { id },
      relations: ['product', 'warehouse', 'supplier']
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async getByProduct(productId: string) {
    return this.batchRepository.find({
      where: { productId },
      relations: ['warehouse'],
      order: { expirationDate: 'ASC' }
    });
  }

  async create(dto: CreateBatchDto) {
    const product = await this.productsRepository.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');
    
    const warehouse = await this.warehousesRepository.findOne({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    // Duplicate batchNumber?
    const existing = await this.batchRepository.findOne({ where: { batchNumber: dto.batchNumber } });
    if (existing) throw new BadRequestException('Batch number already exists');

    const batch = this.batchRepository.create({
      ...dto,
      productName: product.name,
      warehouseName: warehouse.name,
      remainingQuantity: dto.quantity,
      receivedDate: dto.receivedDate || new Date(),
    });

    const saved = await this.batchRepository.save(batch);

    // Update global product stock?
    product.stock += dto.quantity;
    await this.productsRepository.save(product);

    await this.auditService.log({
      userName: 'Admin', // In real, use from context
      action: AuditAction.CREATE,
      resource: 'ProductBatch',

      resourceId: saved.id,
      details: `Création lot ${saved.batchNumber} pour ${saved.productName} (${saved.quantity} unités)`
    });

    return saved;
  }

  async updateStatus(id: string, dto: UpdateBatchStatusDto) {
    const batch = await this.getById(id);
    const oldStatus = batch.status;
    batch.status = dto.status;
    if (dto.reason) {
      batch.notes = batch.notes ? `${batch.notes}\n[Status Change: ${oldStatus} -> ${dto.status}] ${dto.reason}` : `[Status Change: ${oldStatus} -> ${dto.status}] ${dto.reason}`;
    }
    const saved = await this.batchRepository.save(batch);

    await this.auditService.log({
      userName: 'Admin',
      action: AuditAction.UPDATE,
      resource: 'ProductBatch',
      resourceId: saved.id,
      details: `Changement statut lot ${saved.batchNumber} : ${oldStatus} -> ${saved.status}`
    });

    return saved;
  }

  async consume(id: string, dto: ConsumeBatchDto) {
    const batch = await this.getById(id);
    if (batch.status !== BatchStatus.ACTIVE) throw new BadRequestException('Can only consume active batches');
    if (dto.quantity > batch.remainingQuantity) throw new BadRequestException('Insufficient stock in this batch');

    batch.remainingQuantity -= dto.quantity;
    await this.batchRepository.save(batch);

    // Update product global stock
    const product = await this.productsRepository.findOne({ where: { id: batch.productId } });
    if (product) {
      product.stock -= dto.quantity;
      await this.productsRepository.save(product);
    }

    await this.auditService.log({
      userName: 'Admin',
      action: AuditAction.UPDATE,
      resource: 'ProductBatch',
      resourceId: batch.id,
      details: `Consommation lot ${batch.batchNumber} : -${dto.quantity} unités`
    });

    return batch;
  }

  async split(id: string, dto: SplitBatchDto) {
    const original = await this.getById(id);
    if (original.status !== BatchStatus.ACTIVE) throw new BadRequestException('Can only split active batches');
    if (dto.splitQuantity >= original.remainingQuantity) throw new BadRequestException('Split quantity must be less than remaining');

    const targetWh = await this.warehousesRepository.findOne({ where: { id: dto.targetWarehouseId } });
    if (!targetWh) throw new NotFoundException('Target Warehouse not found');

    original.remainingQuantity -= dto.splitQuantity;
    await this.batchRepository.save(original);

    const newBatch = this.batchRepository.create({
      ...original,
      id: undefined,
      batchNumber: `${original.batchNumber}-${Date.now().toString().slice(-4)}`,
      quantity: dto.splitQuantity,
      remainingQuantity: dto.splitQuantity,
      warehouseId: dto.targetWarehouseId,
      warehouseName: targetWh.name,
      notes: `Scission depuis lot ${original.batchNumber}`,
      createdAt: undefined,
      updatedAt: undefined
    });

    const savedNew = await this.batchRepository.save(newBatch);

    await this.auditService.log({
      userName: 'Admin',
      action: AuditAction.CREATE,
      resource: 'ProductBatch',

      resourceId: savedNew.id,
      details: `Scission lot ${original.batchNumber} : ${dto.splitQuantity} unités vers ${targetWh.name}`
    });

    return { original, newBatch: savedNew };
  }

  async transfer(id: string, dto: TransferBatchDto) {
    const batch = await this.getById(id);
    if (batch.status !== BatchStatus.ACTIVE) throw new BadRequestException('Can only transfer active batches');
    
    const targetWh = await this.warehousesRepository.findOne({ where: { id: dto.targetWarehouseId } });
    if (!targetWh) throw new NotFoundException('Target Warehouse not found');

    const oldWhName = batch.warehouseName;
    batch.warehouseId = dto.targetWarehouseId;
    batch.warehouseName = targetWh.name;

    const saved = await this.batchRepository.save(batch);

    await this.auditService.log({
      userName: 'Admin',
      action: AuditAction.UPDATE,
      resource: 'ProductBatch',
      resourceId: saved.id,
      details: `Transfert lot ${saved.batchNumber} : ${oldWhName} -> ${targetWh.name}`
    });

    return saved;
  }

  async qualityCheck(id: string, dto: QualityCheckDto) {
    const batch = await this.getById(id);
    const result = dto.result;
    const newStatus = result === 'fail' ? BatchStatus.QUARANTINE : batch.status;
    
    const qcNote = `[QC ${result.toUpperCase()}] par ${dto.inspectorName}${dto.notes ? ` : ${dto.notes}` : ''}`;
    batch.status = newStatus;
    batch.notes = batch.notes ? `${batch.notes}\n${qcNote}` : qcNote;

    const saved = await this.batchRepository.save(batch);

    await this.auditService.log({
      userName: 'Admin',
      action: AuditAction.UPDATE,
      resource: 'ProductBatch',
      resourceId: saved.id,
      details: `Contrôle qualité lot ${saved.batchNumber} : ${result}`
    });

    return saved;
  }

  async markExpired() {
    const now = new Date();
    const expired = await this.batchRepository.find({
      where: {
        status: BatchStatus.ACTIVE,
        expirationDate: MoreThan(new Date(0)), 
        // Need to check where expirationDate < now
      }
    });

    // Actually, Better use query builder for date comparison
    const result = await this.batchRepository
      .createQueryBuilder()
      .update(ProductBatch)
      .set({ status: BatchStatus.EXPIRED })
      .where("status = :active", { active: BatchStatus.ACTIVE })
      .andWhere("expirationDate IS NOT NULL")
      .andWhere("expirationDate < :now", { now })
      .execute();

    if (result.affected && result.affected > 0) {
      await this.auditService.log({
        userName: 'System',
        action: AuditAction.UPDATE,
        resource: 'ProductBatch',

        details: `Marquage auto de ${result.affected} lots comme expirés`
      });
    }

    return result.affected || 0;
  }

  async getStats() {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const total = await this.batchRepository.count();
    const active = await this.batchRepository.count({ where: { status: BatchStatus.ACTIVE } });
    const expired = await this.batchRepository.count({ where: { status: BatchStatus.EXPIRED } });
    const quarantine = await this.batchRepository.count({ where: { status: BatchStatus.QUARANTINE } });
    const expiringSoon = await this.batchRepository
      .createQueryBuilder('b')
      .where('b.status = :active', { active: BatchStatus.ACTIVE })
      .andWhere('b.expirationDate <= :soon', { soon })
      .andWhere('b.expirationDate > :now', { now })
      .getCount();

    const sums = await this.batchRepository
      .createQueryBuilder('b')
      .select('SUM(b.remainingQuantity)', 'totalRemaining')
      .addSelect('SUM(b.quantity)', 'totalInitial')
      .getRawOne();

    const initial = Number(sums.totalInitial) || 0;
    const remaining = Number(sums.totalRemaining) || 0;

    return {
      totalBatches: total,
      activeBatches: active,
      expiredBatches: expired,
      quarantineBatches: quarantine,
      expiringSoon,
      totalRemainingQty: remaining,
      avgUtilizationRate: initial > 0 ? Math.round(((initial - remaining) / initial) * 100) : 0
    };
  }
}
