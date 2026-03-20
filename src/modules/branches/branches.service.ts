import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Branch } from './entities/branch.entity';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@Injectable()
export class BranchesService {
  constructor(
    @InjectRepository(Branch)
    private readonly branchRepository: Repository<Branch>,
  ) {}

  async findAll() {
    return this.branchRepository.find({ 
      relations: ['warehouses'],
      order: { isMain: 'DESC', name: 'ASC' }
    });
  }

  async findOne(id: string) {
    const branch = await this.branchRepository.findOne({ 
      where: { id },
      relations: ['warehouses']
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  async create(dto: CreateBranchDto) {
    // If setting as main, unset others
    if (dto.isMain) {
      await this.branchRepository.update({ isMain: true }, { isMain: false });
    }
    const branch = this.branchRepository.create(dto);
    return this.branchRepository.save(branch);
  }

  async update(id: string, dto: UpdateBranchDto) {
    const branch = await this.findOne(id);
    if (dto.isMain && !branch.isMain) {
      await this.branchRepository.update({ isMain: true }, { isMain: false });
    }
    Object.assign(branch, dto);
    return this.branchRepository.save(branch);
  }

  async remove(id: string) {
    const branch = await this.findOne(id);
    if (branch.isMain) throw new BadRequestException('Cannot delete the main branch');
    return this.branchRepository.remove(branch);
  }
}
