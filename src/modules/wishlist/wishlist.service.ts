import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from './entities/wishlist.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private readonly wishlistRepository: Repository<Wishlist>,
  ) {}

  async getUserWishlist(userId: string): Promise<Wishlist[]> {
    return await this.wishlistRepository.find({
      where: { userId },
      relations: ['product', 'product.category'],
      order: { createdAt: 'DESC' },
    });
  }

  async addToWishlist(userId: string, productId: string): Promise<Wishlist> {
    const existing = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    if (existing) {
      return existing;
    }

    const wishlist = this.wishlistRepository.create({
      userId,
      productId,
    });

    return await this.wishlistRepository.save(wishlist);
  }

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    const wishlist = await this.wishlistRepository.findOne({
      where: { userId, productId },
    });

    if (!wishlist) {
      throw new NotFoundException('Produit non trouvé dans vos favoris');
    }

    await this.wishlistRepository.remove(wishlist);
  }

  async clearWishlist(userId: string): Promise<void> {
    await this.wishlistRepository.delete({ userId });
  }

  async isInWishlist(userId: string, productId: string): Promise<boolean> {
    const count = await this.wishlistRepository.count({
      where: { userId, productId },
    });
    return count > 0;
  }
}
