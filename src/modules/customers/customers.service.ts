import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
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
    const where: FindOptionsWhere<Customer> = {};

    if (search) {
      where.firstName = Like(`%${search}%`);
      // Note: Pour une recherche plus avancée, utilisez QueryBuilder
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await this.customersRepository.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
      relations: ['orders'],
    });

    return PaginatedResponseBuilder.build(data, total, page, pageSize);
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

    // Ajouter des points fidélité (1 point pour 1000 FCFA)
    const pointsToAdd = Math.floor(orderAmount / 1000);
    customer.loyaltyPoints += pointsToAdd;

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
      });
    }
  }
}
