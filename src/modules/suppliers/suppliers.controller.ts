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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { Supplier } from './entities/supplier.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@ApiTags('suppliers')
@Controller('suppliers')
@ApiBearerAuth()
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau fournisseur' })
  @ApiResponse({ status: 201, description: 'Fournisseur créé avec succès' })
  @ApiResponse({ status: 409, description: 'Code ou email déjà existant' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createSupplierDto: CreateSupplierDto): Promise<Supplier> {
    return this.suppliersService.create(createSupplierDto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée des fournisseurs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Liste des fournisseurs' })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Supplier>> {
    return this.suppliersService.findAll(
      paginationDto.page,
      paginationDto.pageSize,
      paginationDto.search,
    );
  }

  @Get('top')
  @ApiOperation({ summary: 'Top fournisseurs par note' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Liste des meilleurs fournisseurs' })
  getTopSuppliers(@Query('limit') limit?: number): Promise<Supplier[]> {
    return this.suppliersService.getTopSuppliers(limit || 10);
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'un fournisseur" })
  @ApiParam({ name: 'id', description: 'ID du fournisseur' })
  @ApiResponse({ status: 200, description: 'Fournisseur trouvé' })
  @ApiResponse({ status: 404, description: 'Fournisseur non trouvé' })
  findOne(@Param('id') id: string): Promise<Supplier> {
    return this.suppliersService.findOne(id);
  }

  @Get('code/:code')
  @ApiOperation({ summary: "Détail d'un fournisseur par son code" })
  @ApiParam({ name: 'code', description: 'Code du fournisseur' })
  @ApiResponse({ status: 200, description: 'Fournisseur trouvé' })
  @ApiResponse({ status: 404, description: 'Fournisseur non trouvé' })
  findByCode(@Param('code') code: string): Promise<Supplier> {
    return this.suppliersService.findByCode(code);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier un fournisseur' })
  @ApiParam({ name: 'id', description: 'ID du fournisseur' })
  @ApiResponse({ status: 200, description: 'Fournisseur modifié' })
  @ApiResponse({ status: 404, description: 'Fournisseur non trouvé' })
  @ApiResponse({ status: 409, description: 'Code ou email déjà existant' })
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
  ): Promise<Supplier> {
    return this.suppliersService.update(id, updateSupplierDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un fournisseur' })
  @ApiParam({ name: 'id', description: 'ID du fournisseur' })
  @ApiResponse({ status: 204, description: 'Fournisseur supprimé' })
  @ApiResponse({ status: 404, description: 'Fournisseur non trouvé' })
  @ApiResponse({ status: 400, description: 'Fournisseur non supprimable' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.suppliersService.remove(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activer/Désactiver un fournisseur' })
  @ApiParam({ name: 'id', description: 'ID du fournisseur' })
  @ApiResponse({ status: 200, description: 'Statut modifié' })
  @ApiResponse({ status: 404, description: 'Fournisseur non trouvé' })
  toggleStatus(@Param('id') id: string): Promise<Supplier> {
    return this.suppliersService.toggleStatus(id);
  }
}
