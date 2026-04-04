import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('wishlist')
@UseGuards(JwtAuthGuard)
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  async getMyWishlist(@Req() req) {
    return this.wishlistService.getUserWishlist(req.user.id);
  }

  @Post(':productId')
  async addToWishlist(@Req() req, @Param('productId') productId: string) {
    return this.wishlistService.addToWishlist(req.user.id, productId);
  }

  @Delete(':productId')
  async removeFromWishlist(@Req() req, @Param('productId') productId: string) {
    return this.wishlistService.removeFromWishlist(req.user.id, productId);
  }

  @Delete()
  async clearWishlist(@Req() req) {
    return this.wishlistService.clearWishlist(req.user.id);
  }

  @Get('status/:productId')
  async checkStatus(@Req() req, @Param('productId') productId: string) {
    const isInWishlist = await this.wishlistService.isInWishlist(req.user.id, productId);
    return { isInWishlist };
  }
}
