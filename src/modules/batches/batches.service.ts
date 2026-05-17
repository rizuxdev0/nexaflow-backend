import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, In } from 'typeorm';
import { ProductBatch, BatchStatus } from './entities/batch.entity';
import { CreateBatchDto, UpdateBatchStatusDto, ConsumeBatchDto, SplitBatchDto, TransferBatchDto, QualityCheckDto } from './dto/batch.dto';
import { Product } from '../products/entities/product.entity';
import { Warehouse } from '../warehouses/entities/warehouse.entity';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/entities/audit-log.entity';


import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';


@Injectable()
export class BatchesService extends AbstractTenantService<ProductBatch> {
  constructor(
    @InjectRepository(ProductBatch)
    private readonly batchRepository: Repository<ProductBatch>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(Warehouse)
    private readonly warehousesRepository: Repository<Warehouse>,
    private readonly auditService: AuditService,
    tenantService: TenantService,
  ) {
    super(batchRepository, tenantService, 'ProductBatch');
  }

  private get productRepo() {
    return this.tenantService.tenantRepo(this.productsRepository);
  }

  private get warehouseRepo() {
    return this.tenantService.tenantRepo(this.warehousesRepository);
  }

  async findAll(query: { page?: number; pageSize?: number; status?: string; warehouseId?: string, productId?: string, batchNumber?: string, search?: string }) {
    const { page = 1, pageSize = 20, status, warehouseId, productId, batchNumber, search } = query;
    const where: any = {};
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (batchNumber) where.batchNumber = batchNumber;
    if (search) {
      where.batchNumber = search;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
      relations: ['product', 'warehouse', 'supplier']
    });

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const batch = await this.repo.findOne({ 
      where: { id },
      relations: ['product', 'warehouse', 'supplier']
    });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  async getByProduct(productId: string) {
    return this.repo.find({
      where: { productId },
      relations: ['warehouse'],
      order: { expirationDate: 'ASC' }
    });
  }

  async create(dto: CreateBatchDto) {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');
    
    const warehouse = await this.warehouseRepo.findOne({ where: { id: dto.warehouseId } });
    if (!warehouse) throw new NotFoundException('Warehouse not found');

    const existing = await this.repo.findOne({ where: { batchNumber: dto.batchNumber } });
    if (existing) throw new BadRequestException('Batch number already exists');

    const batch = this.repo.create({
      ...dto,
      productName: product.name,
      warehouseName: warehouse.name,
      remainingQuantity: dto.quantity,
      receivedDate: dto.receivedDate || new Date(),
      vendorId: this.tenantService.getVendorId() || undefined,
    });

    const saved = await this.repo.save(batch);

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
    const saved = await this.repo.save(batch);

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
    await this.repo.save(batch);

    // Update product global stock
    const product = await this.productRepo.findOne({ where: { id: batch.productId } });
    if (product) {
      product.stock -= dto.quantity;
      await this.productRepo.save(product);
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

    const targetWh = await this.warehouseRepo.findOne({ where: { id: dto.targetWarehouseId } });
    if (!targetWh) throw new NotFoundException('Target Warehouse not found');

    original.remainingQuantity -= dto.splitQuantity;
    await this.repo.save(original);

    const newBatch = this.repo.create({
      ...original,
      id: undefined,
      batchNumber: `${original.batchNumber}-${Date.now().toString().slice(-4)}`,
      quantity: dto.splitQuantity,
      remainingQuantity: dto.splitQuantity,
      warehouseId: dto.targetWarehouseId,
      warehouseName: targetWh.name,
      notes: `Scission depuis lot ${original.batchNumber}`,
      createdAt: undefined,
      updatedAt: undefined,
      vendorId: this.tenantService.getVendorId() || undefined,
    });

    const savedNew = await this.repo.save(newBatch);

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
    
    const targetWh = await this.warehouseRepo.findOne({ where: { id: dto.targetWarehouseId } });
    if (!targetWh) throw new NotFoundException('Target Warehouse not found');

    const oldWhName = batch.warehouseName;
    batch.warehouseId = dto.targetWarehouseId;
    batch.warehouseName = targetWh.name;

    const saved = await this.repo.save(batch);

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

    const saved = await this.repo.save(batch);

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
    const expired = await this.repo.find({
      where: {
        status: BatchStatus.ACTIVE,
        expirationDate: MoreThan(new Date(0)), 
      }
    });

    const result = await this.repo
      .createQueryBuilder('b')
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

  async getExpiringSoon(days: number = 30) {
    const now = new Date();
    const soon = new Date();
    soon.setDate(now.getDate() + Number(days));

    return await this.repo.find({
      where: {
        status: BatchStatus.ACTIVE,
        expirationDate: Between(now, soon),
      },
      relations: ['product', 'warehouse', 'supplier'],
      order: { expirationDate: 'ASC' },
      take: 50
    });
  }

  async getExpired() {
    const now = new Date();
    return await this.repo.find({
      where: [
        { status: BatchStatus.EXPIRED },
        { status: BatchStatus.ACTIVE, expirationDate: Between(new Date(0), now) }
      ],
      relations: ['product', 'warehouse', 'supplier'],
      order: { expirationDate: 'DESC' },
      take: 50
    });
  }

  async getStats() {
    const now = new Date();
    const soon = new Date();
    soon.setDate(soon.getDate() + 30);

    const total = await this.repo.count();
    const active = await this.repo.count({ where: { status: BatchStatus.ACTIVE } });
    const expired = await this.repo.count({ where: { status: BatchStatus.EXPIRED } });
    const quarantine = await this.repo.count({ where: { status: BatchStatus.QUARANTINE } });
    const expiringSoon = await this.repo
      .createQueryBuilder('b')
      .where('b.status = :active', { active: BatchStatus.ACTIVE })
      .andWhere('b.expirationDate <= :soon', { soon })
      .andWhere('b.expirationDate > :now', { now })
      .getCount();

    const sums = await this.repo
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
