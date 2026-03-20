import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedCart } from './entities/saved-cart.entity';
import { CreateSavedCartDto } from './dto/saved-cart.dto';

@Injectable()
export class SavedCartsService {
  constructor(
    @InjectRepository(SavedCart)
    private readonly cartRepository: Repository<SavedCart>,
  ) {}

  async findAll(query: { customerId?: string; branchId?: string }) {
    const where: any = {};
    if (query.customerId) where.customerId = query.customerId;
    if (query.branchId) where.branchId = query.branchId;

    return this.cartRepository.find({
      where,
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string) {
    const cart = await this.cartRepository.findOne({ where: { id } });
    if (!cart) throw new NotFoundException('Panier non trouvé');
    return cart;
  }

  async create(dto: CreateSavedCartDto) {
    const cart = this.cartRepository.create(dto);
    return this.cartRepository.save(cart);
  }

  async update(id: string, dto: Partial<CreateSavedCartDto>) {
    const cart = await this.findOne(id);
    Object.assign(cart, dto);
    return this.cartRepository.save(cart);
  }

  async remove(id: string) {
    const cart = await this.findOne(id);
    return this.cartRepository.remove(cart);
  }

  // Cleanup expired carts?
  async cleanup() {
    return this.cartRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt IS NOT NULL')
      .andWhere('expiresAt < :now', { now: new Date() })
      .execute();
  }
}
