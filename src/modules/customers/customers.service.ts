import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere, Brackets } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdatePointsDto, PointsOperation } from './dto/update-points.dto';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class CustomersService extends AbstractTenantService<Customer> {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
    tenantService: TenantService,
  ) {
    super(customersRepository, tenantService, 'Customer');
  }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    const existingEmail = await this.repo.findOne({
      where: { email: createCustomerDto.email },
    });

    if (existingEmail) {
      throw new ConflictException(`Un client avec l'email "${createCustomerDto.email}" existe déjà`);
    }

    const customer = this.repo.create({
      ...createCustomerDto,
      vendorId: this.tenantService.getVendorId() || undefined,
    });
    return await this.repo.save(customer);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    isActive?: boolean,
  ): Promise<PaginatedResponse<Customer>> {
    const queryBuilder = this.repo.createQueryBuilder('customer');

    if (search) {
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('customer.firstName ILIKE :search', { search: `%${search}%` })
            .orWhere('customer.lastName ILIKE :search', { search: `%${search}%` })
            .orWhere('customer.email ILIKE :search', { search: `%${search}%` });
        }),
      );
    }

    if (isActive !== undefined) {
      queryBuilder.andWhere('customer.isActive = :isActive', { isActive });
    }

    queryBuilder
      .orderBy('customer.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .leftJoinAndSelect('customer.orders', 'orders');

    const [data, total] = await queryBuilder.getManyAndCount();
    return PaginatedResponseBuilder.build(data, total, page, pageSize);
  }

  async getTopLoyalCustomers(limit: number = 10): Promise<Customer[]> {
    return this.repo.find({
      order: { loyaltyPoints: 'DESC' },
      take: limit,
    });
  }

  async getLoyaltyStats() {
    return this.repo.createQueryBuilder('customer')
      .select('SUM(customer.loyaltyPoints)', 'totalPoints')
      .addSelect('AVG(customer.loyaltyPoints)', 'averagePoints')
      .addSelect('COUNT(customer.id)', 'totalMembers')
      .getRawOne();
  }

  async getTierDistribution() {
    return this.repo.createQueryBuilder('customer')
      .select('customer.loyaltyTier', 'loyaltyTier')
      .addSelect('COUNT(customer.id)', 'count')
      .groupBy('customer.loyaltyTier')
      .getRawMany();
  }

  async findOne(id: string): Promise<Customer> {
    return super.findOne(id, ['orders']);
  }

  async findByEmail(email: string): Promise<Customer> {
    const customer = await this.repo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!customer) throw new NotFoundException(`Client avec l'email "${email}" non trouvé`);
    return customer;
  }

  async update(id: string, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    const customer = await this.findOne(id);

    if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
      const existingEmail = await this.repo.findOne({
        where: { email: updateCustomerDto.email },
      });
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException(`Un client avec l'email "${updateCustomerDto.email}" existe déjà`);
      }
    }

    Object.assign(customer, updateCustomerDto);
    const saved = await this.repo.save(customer);

    try {
      const userRepo = this.repo.manager.getRepository('User');
      const user = await userRepo.findOne({ where: { email: customer.email } });
      if (user) {
        if (updateCustomerDto.firstName) (user as any).firstName = updateCustomerDto.firstName;
        if (updateCustomerDto.lastName) (user as any).lastName = updateCustomerDto.lastName;
        if (updateCustomerDto.phone) (user as any).phone = updateCustomerDto.phone;
        if (updateCustomerDto.profilePicture) (user as any).avatar = updateCustomerDto.profilePicture;
        await userRepo.save(user);
      }
    } catch (e) {
      console.error("❌ Erreur lors de la synchronisation User:", e.message);
    }
    return saved;
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);
    if (customer.orders && customer.orders.length > 0) {
      customer.isActive = false;
      await this.repo.save(customer);
      return;
    }
    await this.repo.remove(customer);
  }

  async toggleStatus(id: string): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.isActive = !customer.isActive;
    return await this.repo.save(customer);
  }

  async updatePoints(id: string, updatePointsDto: UpdatePointsDto): Promise<Customer> {
    const customer = await this.findOne(id);
    let newPoints = customer.loyaltyPoints;

    switch (updatePointsDto.operation) {
      case PointsOperation.SET:
        newPoints = updatePointsDto.points;
        break;
      case PointsOperation.ADD:
        newPoints = customer.loyaltyPoints + updatePointsDto.points;
        customer.lifetimePoints = (customer.lifetimePoints || 0) + updatePointsDto.points;
        break;
      case PointsOperation.REMOVE:
        if (customer.loyaltyPoints < updatePointsDto.points) {
          throw new BadRequestException(`Points insuffisants. Points actuels: ${customer.loyaltyPoints}, à retirer: ${updatePointsDto.points}`);
        }
        newPoints = customer.loyaltyPoints - updatePointsDto.points;
        break;
    }

    if (newPoints < 0) throw new BadRequestException('Les points ne peuvent pas être négatifs');
    customer.loyaltyPoints = newPoints;

    const tiers = [
      { tier: 'bronze', minPoints: 0 },
      { tier: 'silver', minPoints: 500 },
      { tier: 'gold', minPoints: 2000 },
      { tier: 'platinum', minPoints: 5000 },
    ];
    let currentTier = 'bronze';
    for (const t of tiers) {
      if ((customer.lifetimePoints || 0) >= t.minPoints) {
        currentTier = t.tier;
      }
    }
    customer.loyaltyTier = currentTier;
    return await this.repo.save(customer);
  }

  async getTopCustomers(limit: number = 5): Promise<Customer[]> {
    return await this.repo.find({
      where: { isActive: true },
      order: { totalSpent: 'DESC' },
      take: limit,
    });
  }

  async getCustomerOrders(id: string): Promise<any[]> {
    const customer = await this.findOne(id);
    return customer.orders || [];
  }

  async updateCustomerStats(id: string, orderAmount: number): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.totalOrders += 1;
    customer.totalSpent = Number(customer.totalSpent) + orderAmount;
    customer.lastOrderDate = new Date();
    return await this.repo.save(customer);
  }

  async findOrCreateByEmail(email: string, customerData?: Partial<Customer>): Promise<Customer> {
    try {
      return await this.findByEmail(email);
    } catch (error) {
      return await this.create({
        firstName: customerData?.firstName || 'Client',
        lastName: customerData?.lastName || email.split('@')[0],
        email,
        phone: customerData?.phone,
        address: customerData?.address,
        city: customerData?.city,
        source: customerData?.source || 'pos',
      });
    }
  }

  async getGlobalStats() {
    const [total, active, inactive] = await Promise.all([
      this.repo.count(),
      this.repo.count({ where: { isActive: true } }),
      this.repo.count({ where: { isActive: false } }),
    ]);

    const top5 = await this.getTopCustomers(5);
    const topRevenue = top5.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);

    const result = await this.repo.createQueryBuilder('customer')
      .select('AVG(customer.totalSpent)', 'avgSpent')
      .getRawOne();

    const bySource = await this.repo.createQueryBuilder('customer')
      .select('customer.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('customer.source')
      .getRawMany();

    return {
      total,
      active,
      inactive,
      topRevenue,
      avgSpent: Math.round(Number(result?.avgSpent || 0)),
      bySource,
    };
  }
}
