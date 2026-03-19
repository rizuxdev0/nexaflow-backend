import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from './entities/package.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private readonly packageRepository: Repository<Package>,
  ) {}

  async getBundles(page: number = 1, pageSize: number = 20, includeInactive: boolean = false) {
    const where = includeInactive ? {} : { isActive: true };
    const [data, total] = await this.packageRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async createBundle(createPackageDto: CreatePackageDto): Promise<Package> {
    const slug = createPackageDto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const pkg = this.packageRepository.create({
      ...createPackageDto,
      slug
    });
    return this.packageRepository.save(pkg);
  }

  async updateBundle(id: string, updatePackageDto: UpdatePackageDto): Promise<Package> {
    const pkg = await this.packageRepository.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Pack non trouvé');
    
    Object.assign(pkg, updatePackageDto);
    if (updatePackageDto.name) {
      pkg.slug = updatePackageDto.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    
    return this.packageRepository.save(pkg);
  }

  async deleteBundle(id: string): Promise<void> {
    const pkg = await this.packageRepository.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException('Pack non trouvé');
    await this.packageRepository.remove(pkg);
  }
}
