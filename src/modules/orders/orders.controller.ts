import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreatePosOrderDto } from '../products/dto/create-pos-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { Order } from './entities/order.entity';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('orders')
@Controller('orders')
@ApiBearerAuth()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('pos')
  @ApiOperation({ summary: 'Créer une commande depuis le point de vente (POS)' })
  @ApiResponse({ status: 201, description: 'Commande créée avec succès' })
  @HttpCode(HttpStatus.CREATED)
  createPosOrder(
    @Body() createPosOrderDto: CreatePosOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.createPosOrder(createPosOrderDto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée des commandes' })
  @ApiResponse({ status: 200, description: 'Liste des commandes' })
  findAll(
    @Query() filterDto: OrderFilterDto,
  ): Promise<PaginatedResponse<Order>> {
    return this.ordersService.findAll(
      filterDto.page,
      filterDto.pageSize,
      filterDto.status,
      filterDto.paymentStatus,
      filterDto.customerId,
      filterDto.userId,
      filterDto.search || filterDto.orderNumber,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une commande" })
  @ApiParam({ name: 'id', description: 'ID de la commande' })
  @ApiResponse({ status: 200, description: 'Commande trouvée' })
  @ApiResponse({ status: 404, description: 'Commande non trouvée' })
  findOne(@Param('id') id: string): Promise<Order> {
    return this.ordersService.findOne(id);
  }
}
