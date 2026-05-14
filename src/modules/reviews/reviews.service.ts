import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto, ModerateReviewDto, ReplyReviewDto } from './dto/review.dto';
import { Product } from '../products/entities/product.entity';
import { TenantService } from '../../common/tenant/tenant.service';
import { AbstractTenantService } from '../../common/tenant/abstract-tenant.service';

@Injectable()
export class ReviewsService extends AbstractTenantService<Review> {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    tenantService: TenantService,
  ) {
    super(reviewRepository, tenantService, 'Review');
  }

  private get productsRepo() { return this.tenantRepo(this.productsRepository); }

  async getByProduct(productId: string, page: number = 1, pageSize: number = 10) {
    const [data, total] = await this.repo.findAndCount({
      where: { productId, status: 'approved' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' } as any,
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getProductStats(productId: string) {
    const reviews = await this.repo.find({
      where: { productId, status: 'approved' },
    });

    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) distribution[r.rating - 1]++;
    });

    return { 
      avg: Math.round(avg * 10) / 10, 
      total, 
      distribution 
    };
  }

  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    // We need to find the product to get the vendorId
    // We use productsRepo which is proxied (cross-tenant safety)
    const product = await this.productsRepo.findOne({ where: { id: createReviewDto.productId } });
    if (!product) throw new NotFoundException('Produit non trouvé');

    if (createReviewDto.customerId && createReviewDto.customerId !== 'guest') {
      const existing = await this.repo.findOne({
        where: {
          productId: createReviewDto.productId,
          customerId: createReviewDto.customerId,
        },
      });

      if (existing) {
        throw new ConflictException('Vous avez déjà donné votre avis sur ce produit.');
      }
    }

    const review = this.repo.create({
      ...createReviewDto,
      vendorId: product.vendorId,
      status: 'approved',
      helpful: 0,
    });
    return this.repo.save(review);
  }

  async markHelpful(id: string): Promise<Review> {
    const review = await this.findOne(id);
    review.helpful += 1;
    return this.repo.save(review);
  }

  async reply(id: string, replyDto: ReplyReviewDto, adminName: string): Promise<Review> {
    const review = await this.findOne(id);

    review.reply = {
      text: replyDto.text,
      repliedAt: new Date().toISOString(),
      repliedBy: adminName,
    };

    return this.repo.save(review);
  }

  async getRecentReviews(limit: number = 10) {
    return this.repo.find({
      where: { status: 'approved' },
      order: { createdAt: 'DESC' } as any,
      take: limit,
    });
  }

  // --- Admin Moderation ---

  async getPending(page: number = 1, pageSize: number = 20) {
    const [data, total] = await this.repo.findAndCount({
      where: { status: 'pending' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' } as any,
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async moderate(id: string, moderateDto: ModerateReviewDto): Promise<Review> {
    const review = await this.findOne(id);
    review.status = moderateDto.status;
    return this.repo.save(review);
  }
}
