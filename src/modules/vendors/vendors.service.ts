import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor, VendorStatus } from './entities/vendor.entity';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async findAll(page = 1, pageSize = 20, status?: string, search?: string) {
    const query = this.vendorRepository.createQueryBuilder('vendor');

    if (status && status !== 'all') {
      query.andWhere('vendor.status = :status', { status });
    }

    if (search) {
      query.andWhere(
        '(vendor.name ILIKE :search OR vendor.email ILIKE :search OR vendor.phone ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await query
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .orderBy('vendor.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id },
    });

    if (!vendor) {
      throw new NotFoundException('Vendeur non trouvé');
    }

    return vendor;
  }

  async getStats() {
    const activeVendors = await this.vendorRepository.count({
      where: { status: VendorStatus.ACTIVE },
    });
    const pendingVendors = await this.vendorRepository.count({
      where: { status: VendorStatus.PENDING },
    });

    const result = await this.vendorRepository
      .createQueryBuilder('vendor')
      .select('SUM(vendor.totalRevenue)', 'totalRevenue')
      .addSelect('SUM(vendor.totalCommission)', 'totalCommissions')
      .addSelect('SUM(vendor.pendingPayout)', 'pendingPayouts')
      .addSelect('AVG(vendor.commissionRate)', 'avgCommissionRate')
      .getRawOne();

    // Top vendors
    const topVendors = await this.vendorRepository
      .createQueryBuilder('vendor')
      .select([
        'vendor.id as vendorId',
        'vendor.name as vendorName',
        'vendor.totalRevenue as revenue',
        'vendor.totalOrders as orders',
      ])
      .where('vendor.status = :status', { status: VendorStatus.ACTIVE })
      .orderBy('vendor.totalRevenue', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      activeVendors,
      pendingVendors,
      totalRevenue: Number(result.totalRevenue) || 0,
      totalCommissions: Number(result.totalCommissions) || 0,
      pendingPayouts: Number(result.pendingPayouts) || 0,
      avgCommissionRate: Number(result.avgCommissionRate) || 15,
      topVendors: topVendors.map(v => ({
        ...v,
        revenue: Number(v.revenue),
        orders: Number(v.orders),
      })),
    };
  }

  async updateStatus(id: string, status: VendorStatus, reason?: string) {
    const vendor = await this.findOne(id);
    vendor.status = status;
    if (reason) {
      vendor.suspendedReason = reason;
      vendor.notes = `${vendor.notes || ''}\nStatut ${status}: ${reason}`;
    }
    if (status === VendorStatus.ACTIVE && !vendor.verifiedAt) {
      vendor.verifiedAt = new Date();
    }
    return await this.vendorRepository.save(vendor);
  }

  async create(data: any) {
    const vendor = this.vendorRepository.create(data as object) as Vendor;
    if (!vendor.slug && vendor.name) {
      vendor.slug = vendor.name.toLowerCase().replace(/ /g, '-');
    }
    return await this.vendorRepository.save(vendor);
  }

  async update(id: string, data: any) {
    const vendor = await this.findOne(id);
    Object.assign(vendor, data);
    return await this.vendorRepository.save(vendor);
  }

  async remove(id: string) {
    const vendor = await this.findOne(id);
    return await this.vendorRepository.remove(vendor);
  }
}
