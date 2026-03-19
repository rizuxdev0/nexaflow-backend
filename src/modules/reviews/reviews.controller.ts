import { Controller, Get, Post, Body, Param, Patch, Query, UseGuards, Request } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ModerateReviewDto, ReplyReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators/public.decorator';

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get('product/:productId')
  getByProduct(
    @Param('productId') productId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string
  ) {
    return this.reviewsService.getByProduct(productId, +page || 1, +pageSize || 10);
  }

  @Public()
  @Get('stats/:productId')
  getProductStats(@Param('productId') productId: string) {
    return this.reviewsService.getProductStats(productId);
  }

  @Public()
  @Get('recent')
  getRecentReviews(@Query('limit') limit: string) {
    return this.reviewsService.getRecentReviews(+limit || 10);
  }

  @Public() // Can be protected if we restrict reviews to logged-in users only.
  @Post()
  create(@Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(createReviewDto);
  }

  @Public()
  @Post(':id/helpful')
  markHelpful(@Param('id') id: string) {
    return this.reviewsService.markHelpful(id);
  }

  // --- Admin Endpoints ---

  @Get('pending')
  @Roles('admin', 'manager')
  @Permissions('reviews.read')
  getPending(@Query('page') page: string, @Query('pageSize') pageSize: string) {
    return this.reviewsService.getPending(+page || 1, +pageSize || 20);
  }

  @Patch(':id/moderate')
  @Roles('admin', 'manager')
  @Permissions('reviews.update')
  moderate(@Param('id') id: string, @Body() moderateDto: ModerateReviewDto) {
    return this.reviewsService.moderate(id, moderateDto);
  }

  @Post(':id/reply')
  @Roles('admin', 'manager')
  @Permissions('reviews.update')
  reply(@Param('id') id: string, @Body() replyDto: ReplyReviewDto, @Request() req) {
    // Determine admin name from request token if possible
    const adminName = req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : 'Admin';
    return this.reviewsService.reply(id, replyDto, adminName);
  }
}
