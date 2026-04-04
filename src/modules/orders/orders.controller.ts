import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpStatus,
  HttpCode,
  UseGuards,
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
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderFilterDto } from './dto/order-filter.dto';
import { Order } from './entities/order.entity';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

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

  @Public()
  @Post()
  @ApiOperation({ summary: 'Créer une commande (Ecommerce ou autre)' })
  @ApiResponse({ status: 201, description: 'Commande créée avec succès' })
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() user: any,
  ) {
    return this.ordersService.create(createOrderDto, user);
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
      filterDto.paymentMethod,
      filterDto.source,
      filterDto.customerId,
      filterDto.userId,
      filterDto.search || filterDto.orderNumber,
      filterDto.dateFrom ? new Date(filterDto.dateFrom) : undefined,
      filterDto.dateTo ? new Date(filterDto.dateTo) : undefined,
    );
  }

  @Get('stats')
  @ApiOperation({ summary: 'Obtenir les statistiques des commandes selon les filtres' })
  @ApiResponse({ status: 200, description: 'Statistiques des commandes' })
  getStats(
    @Query() filterDto: OrderFilterDto,
  ) {
    return this.ordersService.getStats(
      filterDto.status,
      filterDto.paymentStatus,
      filterDto.customerId,
      filterDto.userId,
      filterDto.search || filterDto.orderNumber,
      filterDto.dateFrom ? new Date(filterDto.dateFrom) : undefined,
      filterDto.dateTo ? new Date(filterDto.dateTo) : undefined,
    );
  }

  @Get('recent')
  @ApiOperation({ summary: 'Dernières commandes récentes' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre de commandes à retourner (max 50)' })
  @ApiResponse({ status: 200, description: 'Liste des commandes récentes' })
  async findRecent(@Query('limit') limit?: number): Promise<Order[]> {
    return this.ordersService.findRecent(Math.min(limit || 10, 50));
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
