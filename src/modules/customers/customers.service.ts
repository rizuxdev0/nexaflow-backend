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

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private customersRepository: Repository<Customer>,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    // Vérifier si l'email existe déjà
    const existingEmail = await this.customersRepository.findOne({
      where: { email: createCustomerDto.email },
    });

    if (existingEmail) {
      throw new ConflictException(
        `Un client avec l'email "${createCustomerDto.email}" existe déjà`,
      );
    }

    const customer = this.customersRepository.create(createCustomerDto);
    return await this.customersRepository.save(customer);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    isActive?: boolean,
  ): Promise<PaginatedResponse<Customer>> {
    const queryBuilder = this.customersRepository.createQueryBuilder('customer');

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
    return this.customersRepository.find({
      order: { loyaltyPoints: 'DESC' },
      take: limit,
    });
  }

  async getLoyaltyStats() {
    return this.customersRepository
      .createQueryBuilder('customer')
      .select('SUM(customer.loyaltyPoints)', 'totalPoints')
      .addSelect('AVG(customer.loyaltyPoints)', 'averagePoints')
      .addSelect('COUNT(customer.id)', 'totalMembers')
      .getRawOne();
  }

  async getTierDistribution() {
    return this.customersRepository
      .createQueryBuilder('customer')
      .select('customer.loyaltyTier', 'loyaltyTier')
      .addSelect('COUNT(customer.id)', 'count')
      .groupBy('customer.loyaltyTier')
      .getRawMany();
  }

  async findOne(id: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { id },
      relations: ['orders'],
    });

    if (!customer) {
      throw new NotFoundException(`Client avec l'ID "${id}" non trouvé`);
    }

    return customer;
  }

  async findByEmail(email: string): Promise<Customer> {
    const customer = await this.customersRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!customer) {
      throw new NotFoundException(`Client avec l'email "${email}" non trouvé`);
    }

    return customer;
  }

  async update(
    id: string,
    updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.findOne(id);

    // Vérifier l'unicité de l'email si modifié
    if (updateCustomerDto.email && updateCustomerDto.email !== customer.email) {
      const existingEmail = await this.customersRepository.findOne({
        where: { email: updateCustomerDto.email },
      });

      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException(
          `Un client avec l'email "${updateCustomerDto.email}" existe déjà`,
        );
      }
    }

    Object.assign(customer, updateCustomerDto);
    return await this.customersRepository.save(customer);
  }

  async remove(id: string): Promise<void> {
    const customer = await this.findOne(id);

    // Vérifier si le client a des commandes
    if (customer.orders && customer.orders.length > 0) {
      // Soft delete : désactiver le client
      customer.isActive = false;
      await this.customersRepository.save(customer);
      return;
    }

    // Pas de commandes : suppression physique
    await this.customersRepository.remove(customer);
  }

  async toggleStatus(id: string): Promise<Customer> {
    const customer = await this.findOne(id);
    customer.isActive = !customer.isActive;
    return await this.customersRepository.save(customer);
  }

  async updatePoints(
    id: string,
    updatePointsDto: UpdatePointsDto,
  ): Promise<Customer> {
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
          throw new BadRequestException(
            `Points insuffisants. Points actuels: ${customer.loyaltyPoints}, à retirer: ${updatePointsDto.points}`,
          );
        }
        newPoints = customer.loyaltyPoints - updatePointsDto.points;
        break;
    }

    if (newPoints < 0) {
      throw new BadRequestException('Les points ne peuvent pas être négatifs');
    }

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

    return await this.customersRepository.save(customer);
  }

  async getTopCustomers(limit: number = 5): Promise<Customer[]> {
    return await this.customersRepository.find({
      where: { isActive: true },
      order: { totalSpent: 'DESC' },
      take: limit,
    });
  }

  async getCustomerOrders(id: string): Promise<any[]> {
    const customer = await this.findOne(id);
    return customer.orders || [];
  }

  async updateCustomerStats(
    id: string,
    orderAmount: number,
  ): Promise<Customer> {
    const customer = await this.findOne(id);

    customer.totalOrders += 1;
    customer.totalSpent = Number(customer.totalSpent) + orderAmount;
    customer.lastOrderDate = new Date();

    return await this.customersRepository.save(customer);
  }

  async findOrCreateByEmail(
    email: string,
    customerData?: Partial<Customer>,
  ): Promise<Customer> {
    try {
      return await this.findByEmail(email);
    } catch (error) {
      if (error instanceof NotFoundException) {
        // L'email n'existe pas, créer un nouveau client
        console.warn(
          `Client avec l'email "${email}" non trouvé. Création d'un nouveau client.`,
        );
      } else {
        // Autre erreur, la propager
        throw error;
      }
      // Créer un nouveau client
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
      this.customersRepository.count(),
      this.customersRepository.count({ where: { isActive: true } }),
      this.customersRepository.count({ where: { isActive: false } }),
    ]);

    const top5 = await this.getTopCustomers(5);
    const topRevenue = top5.reduce((sum, c) => sum + Number(c.totalSpent || 0), 0);

    const result = await this.customersRepository
      .createQueryBuilder('customer')
      .select('AVG(customer.totalSpent)', 'avgSpent')
      .getRawOne();

    const bySource = await this.customersRepository
      .createQueryBuilder('customer')
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
