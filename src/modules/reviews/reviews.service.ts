import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { CreateReviewDto, ModerateReviewDto, ReplyReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
  ) {}

  async getByProduct(productId: string, page: number = 1, pageSize: number = 10) {
    const [data, total] = await this.reviewRepository.findAndCount({
      where: { productId, status: 'approved' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getProductStats(productId: string) {
    const reviews = await this.reviewRepository.find({
      where: { productId, status: 'approved' },
    });

    const total = reviews.length;
    const avg = total > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / total : 0;
    
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(r => distribution[r.rating - 1]++);

    return { 
      avg: Math.round(avg * 10) / 10, 
      total, 
      distribution 
    };
  }

  async create(createReviewDto: CreateReviewDto): Promise<Review> {
    // Prevent duplicate reviews for the same product by the same customer (except for guests)
    if (createReviewDto.customerId && createReviewDto.customerId !== 'guest') {
      const existing = await this.reviewRepository.findOne({
        where: {
          productId: createReviewDto.productId,
          customerId: createReviewDto.customerId,
        },
      });

      if (existing) {
        throw new ConflictException('Vous avez déjà donné votre avis sur ce produit.');
      }
    }

    const review = this.reviewRepository.create({
      ...createReviewDto,
      status: 'approved', // Auto-approve for immediate visibility as requested
      helpful: 0,
    });
    return this.reviewRepository.save(review);
  }

  async markHelpful(id: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Avis non trouvé');
    
    review.helpful += 1;
    return this.reviewRepository.save(review);
  }

  async reply(id: string, replyDto: ReplyReviewDto, adminName: string): Promise<Review> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Avis non trouvé');

    review.reply = {
      text: replyDto.text,
      repliedAt: new Date().toISOString(),
      repliedBy: adminName,
    };

    return this.reviewRepository.save(review);
  }

  async getRecentReviews(limit: number = 10) {
    return this.reviewRepository.find({
      where: { status: 'approved' },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // --- Admin Moderation ---

  async getPending(page: number = 1, pageSize: number = 20) {
    const [data, total] = await this.reviewRepository.findAndCount({
      where: { status: 'pending' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async moderate(id: string, moderateDto: ModerateReviewDto): Promise<Review> {
    const review = await this.reviewRepository.findOne({ where: { id } });
    if (!review) throw new NotFoundException('Avis non trouvé');

    review.status = moderateDto.status;
    return this.reviewRepository.save(review);
  }
}
