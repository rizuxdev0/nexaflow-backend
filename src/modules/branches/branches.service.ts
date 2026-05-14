import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class BranchesService extends AbstractTenantService<Branch> {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
    tenantService: TenantService,
  ) {
    super(branchRepository, tenantService, 'Branch');
  }

  async findAll() {
    return super.findAll({ 
      relations: ['warehouses'],
      order: { isMain: 'DESC', name: 'ASC' }
    });
  }

  async findOne(id: string) {
    return super.findOne(id, ['warehouses']);
  }

  async create(dto: CreateBranchDto) {
    const vendorId = this.tenantService.getVendorId();
    // If setting as main, unset others for this vendor
    if (dto.isMain) {
      await this.repo.update({ isMain: true }, { isMain: false });
    }
    const branch = this.repo.create({
      ...dto,
      vendorId: vendorId || undefined,
    });
    return this.repo.save(branch);
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.findOne(id);
    if (dto.isMain && !branch.isMain) {
      await this.repo.update({ isMain: true }, { isMain: false });
    }
    Object.assign(branch, dto);
    return this.repo.save(branch);
  }

  async remove(id: string) {
    const branch = await this.findOne(id);
    if (branch.isMain) throw new BadRequestException('Cannot delete the main branch');
    return super.remove(id);
  }
}
