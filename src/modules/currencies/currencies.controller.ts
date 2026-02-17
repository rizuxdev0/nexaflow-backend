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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { CreateCurrencyDto } from './dto/create-currency.dto';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { Currency } from './entities/currency.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';

@ApiTags('currencies')
@Controller('currencies')
@ApiBearerAuth()
@Roles('admin', 'super_admin')
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Post()
  @Permissions('settings.create')
  @ApiOperation({ summary: 'Créer une nouvelle devise' })
  @ApiResponse({ status: 201, description: 'Devise créée avec succès' })
  @ApiResponse({ status: 409, description: 'Code déjà existant' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCurrencyDto: CreateCurrencyDto): Promise<Currency> {
    return this.currenciesService.create(createCurrencyDto);
  }

  @Get()
  @Permissions('settings.read')
  @ApiOperation({ summary: 'Liste paginée des devises' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des devises' })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Currency>> {
    return this.currenciesService.findAll(
      paginationDto.page,
      paginationDto.pageSize,
    );
  }

  @Get('active')
  @ApiOperation({ summary: 'Liste de toutes les devises actives' })
  @ApiResponse({ status: 200, description: 'Liste des devises actives' })
  findAllActive(): Promise<Currency[]> {
    return this.currenciesService.findAllActive();
  }

  @Get('default')
  @Permissions('settings.read')
  @ApiOperation({ summary: 'Obtenir la devise par défaut' })
  @ApiResponse({ status: 200, description: 'Devise par défaut' })
  @ApiResponse({ status: 404, description: 'Aucune devise par défaut trouvée' })
  getDefaultCurrency(): Promise<Currency> {
    return this.currenciesService.getDefaultCurrency();
  }

  @Get('convert')
  @ApiOperation({ summary: 'Convertir un montant entre deux devises' })
  @ApiQuery({ name: 'amount', required: true, type: Number })
  @ApiQuery({ name: 'from', required: true, type: String })
  @ApiQuery({ name: 'to', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Montant converti' })
  async convertAmount(
    @Query('amount') amount: number,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<{ amount: number; from: string; to: string; result: number }> {
    const result = await this.currenciesService.convertAmount(amount, from, to);
    return {
      amount,
      from,
      to,
      result,
    };
  }

  @Get('rate')
  @ApiOperation({ summary: 'Obtenir le taux de change entre deux devises' })
  @ApiQuery({ name: 'from', required: true, type: String })
  @ApiQuery({ name: 'to', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Taux de change' })
  async getExchangeRate(
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<{ from: string; to: string; rate: number }> {
    const rate = await this.currenciesService.getExchangeRate(from, to);
    return { from, to, rate };
  }

  @Get(':id')
  @Permissions('settings.read')
  @ApiOperation({ summary: "Détail d'une devise" })
  @ApiParam({ name: 'id', description: 'ID de la devise' })
  @ApiResponse({ status: 200, description: 'Devise trouvée' })
  @ApiResponse({ status: 404, description: 'Devise non trouvée' })
  findOne(@Param('id') id: string): Promise<Currency> {
    return this.currenciesService.findOne(id);
  }

  @Get('code/:code')
  @Permissions('settings.read')
  @ApiOperation({ summary: "Détail d'une devise par son code" })
  @ApiParam({ name: 'code', description: 'Code de la devise (ex: XOF)' })
  @ApiResponse({ status: 200, description: 'Devise trouvée' })
  @ApiResponse({ status: 404, description: 'Devise non trouvée' })
  findByCode(@Param('code') code: string): Promise<Currency> {
    return this.currenciesService.findByCode(code);
  }

  @Put(':id')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Modifier une devise' })
  @ApiParam({ name: 'id', description: 'ID de la devise' })
  @ApiResponse({ status: 200, description: 'Devise modifiée' })
  @ApiResponse({ status: 404, description: 'Devise non trouvée' })
  @ApiResponse({ status: 409, description: 'Code déjà existant' })
  update(
    @Param('id') id: string,
    @Body() updateCurrencyDto: UpdateCurrencyDto,
  ): Promise<Currency> {
    return this.currenciesService.update(id, updateCurrencyDto);
  }

  @Delete(':id')
  @Permissions('settings.delete')
  @ApiOperation({ summary: 'Supprimer une devise' })
  @ApiParam({ name: 'id', description: 'ID de la devise' })
  @ApiResponse({ status: 204, description: 'Devise supprimée' })
  @ApiResponse({ status: 404, description: 'Devise non trouvée' })
  @ApiResponse({ status: 400, description: 'Devise non supprimable' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.currenciesService.remove(id);
  }

  @Patch(':id/toggle')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Activer/Désactiver une devise' })
  @ApiParam({ name: 'id', description: 'ID de la devise' })
  @ApiResponse({ status: 200, description: 'Statut modifié' })
  @ApiResponse({ status: 404, description: 'Devise non trouvée' })
  @ApiResponse({
    status: 400,
    description: 'Impossible de désactiver la devise par défaut',
  })
  toggleStatus(@Param('id') id: string): Promise<Currency> {
    return this.currenciesService.toggleStatus(id);
  }

  @Patch(':id/set-default')
  @Permissions('settings.update')
  @ApiOperation({ summary: 'Définir une devise comme défaut' })
  @ApiParam({ name: 'id', description: 'ID de la devise' })
  @ApiResponse({ status: 200, description: 'Devise définie comme défaut' })
  @ApiResponse({ status: 404, description: 'Devise non trouvée' })
  @ApiResponse({ status: 400, description: 'Devise inactive' })
  setAsDefault(@Param('id') id: string): Promise<Currency> {
    return this.currenciesService.setAsDefault(id);
  }
}
