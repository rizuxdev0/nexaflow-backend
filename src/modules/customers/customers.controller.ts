import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  Put,
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
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { UpdatePointsDto } from './dto/update-points.dto';
import { Customer } from './entities/customer.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('customers')
@Controller('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post()
  @Permissions('customers.create')
  @ApiOperation({ summary: 'Créer un nouveau client' })
  @ApiResponse({ status: 201, description: 'Client créé avec succès' })
  @ApiResponse({ status: 409, description: 'Email déjà existant' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCustomerDto: CreateCustomerDto): Promise<Customer> {
    return this.customersService.create(createCustomerDto);
  }

  @Get('stats')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Statistiques globales des clients' })
  @ApiResponse({ status: 200, description: 'Statistiques globales' })
  getGlobalStats() {
    return this.customersService.getGlobalStats();
  }

  @Get()
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Liste paginée des clients' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Liste des clients' })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Customer>> {
    return this.customersService.findAll(
      paginationDto.page,
      paginationDto.pageSize,
      paginationDto.search,
      paginationDto.isActive,
    );
  }

  @Get('top')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Top clients par montant dépensé' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des meilleurs clients' })
  getTopCustomers(@Query('limit') limit?: number): Promise<Customer[]> {
    return this.customersService.getTopCustomers(limit || 5);
  }

  @Get('top-loyal')
  @Permissions('customers.read')
  @ApiOperation({ summary: 'Top clients par points de fidélité' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des clients les plus fidèles' })
  getTopLoyalCustomers(@Query('limit') limit?: number): Promise<Customer[]> {
    return this.customersService.getTopLoyalCustomers(limit || 10);
  }

  @Get('email/:email')
  @Permissions('customers.read')
  @ApiOperation({ summary: "Détail d'un client par email" })
  @ApiParam({ name: 'email', description: 'Email du client' })
  @ApiResponse({ status: 200, description: 'Client trouvé' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  findByEmail(@Param('email') email: string): Promise<Customer> {
    return this.customersService.findByEmail(email);
  }

  @Get('me')
  @ApiOperation({ summary: "Récupérer mon propre profil client" })
  @ApiResponse({ status: 200, description: 'Profil trouvé' })
  async findMe(@CurrentUser() user: any): Promise<Customer> {
    return this.customersService.findOrCreateByEmail(user.email, {
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      source: 'ecommerce'
    });
  }

  @Patch('me')
  @ApiOperation({ summary: "Mettre à jour mon propre profil client" })
  @ApiResponse({ status: 200, description: 'Profil mis à jour' })
  async updateMe(
    @CurrentUser() user: any,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    const customer = await this.customersService.findByEmail(user.email);
    return this.customersService.update(customer.id, updateCustomerDto);
  }

  @Get(':id')
  @Permissions('customers.read')
  @ApiOperation({ summary: "Détail d'un client" })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Client trouvé' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  findOne(@Param('id') id: string): Promise<Customer> {
    return this.customersService.findOne(id);
  }

  @Get(':id/orders')
  @Permissions('customers.read')
  @ApiOperation({ summary: "Commandes d'un client" })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Commandes du client' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  getCustomerOrders(@Param('id') id: string): Promise<any[]> {
    return this.customersService.getCustomerOrders(id);
  }

  @Patch(':id')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Modifier un client' })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Client modifié' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  @ApiResponse({ status: 409, description: 'Email déjà existant' })
  update(
    @Param('id') id: string,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ): Promise<Customer> {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  @Permissions('customers.delete')
  @ApiOperation({ summary: 'Supprimer un client' })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 204, description: 'Client supprimé' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.customersService.remove(id);
  }

  @Patch(':id/toggle')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Activer/Désactiver un client' })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Statut modifié' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  toggleStatus(@Param('id') id: string): Promise<Customer> {
    return this.customersService.toggleStatus(id);
  }

  @Patch(':id/points')
  @Permissions('customers.update')
  @ApiOperation({ summary: 'Ajouter/retirer des points fidélité' })
  @ApiParam({ name: 'id', description: 'ID du client' })
  @ApiResponse({ status: 200, description: 'Points mis à jour' })
  @ApiResponse({ status: 404, description: 'Client non trouvé' })
  @ApiResponse({ status: 400, description: 'Points insuffisants' })
  updatePoints(
    @Param('id') id: string,
    @Body() updatePointsDto: UpdatePointsDto,
  ): Promise<Customer> {
    return this.customersService.updatePoints(id, updatePointsDto);
  }
}
