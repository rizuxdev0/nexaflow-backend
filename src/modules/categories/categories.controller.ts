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
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';

@ApiTags('categories')
@Controller('categories')
@ApiBearerAuth()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle catégorie' })
  @ApiResponse({ status: 201, description: 'Catégorie créée avec succès' })
  @ApiResponse({ status: 409, description: 'Catégorie déjà existante' })
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCategoryDto: CreateCategoryDto): Promise<Category> {
    return this.categoriesService.create(createCategoryDto);
  }

  @Get()
  @ApiOperation({ summary: 'Liste paginée des catégories' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Liste des catégories' })
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResponse<Category>> {
    return this.categoriesService.findAll(
      paginationDto.page,
      paginationDto.pageSize,
      paginationDto.search,
    );
  }

  @Get('tree')
  @ApiOperation({ summary: 'Arborescence complète des catégories' })
  @ApiResponse({ status: 200, description: 'Arborescence des catégories' })
  getTree(): Promise<Category[]> {
    return this.categoriesService.getCategoryTree();
  }

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une catégorie" })
  @ApiParam({ name: 'id', description: 'ID de la catégorie' })
  @ApiResponse({ status: 200, description: 'Catégorie trouvée' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  findOne(@Param('id') id: string): Promise<Category> {
    return this.categoriesService.findOne(id);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: "Détail d'une catégorie par son slug" })
  @ApiParam({ name: 'slug', description: 'Slug de la catégorie' })
  @ApiResponse({ status: 200, description: 'Catégorie trouvée' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  findBySlug(@Param('slug') slug: string): Promise<Category> {
    return this.categoriesService.findBySlug(slug);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Modifier une catégorie' })
  @ApiParam({ name: 'id', description: 'ID de la catégorie' })
  @ApiResponse({ status: 200, description: 'Catégorie modifiée' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    return this.categoriesService.update(id, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une catégorie' })
  @ApiParam({ name: 'id', description: 'ID de la catégorie' })
  @ApiResponse({ status: 204, description: 'Catégorie supprimée' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  @ApiResponse({ status: 400, description: 'Catégorie non supprimable' })
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }

  @Patch(':id/toggle')
  @ApiOperation({ summary: 'Activer/Désactiver une catégorie' })
  @ApiParam({ name: 'id', description: 'ID de la catégorie' })
  @ApiResponse({ status: 200, description: 'Statut modifié' })
  @ApiResponse({ status: 404, description: 'Catégorie non trouvée' })
  toggleStatus(@Param('id') id: string): Promise<Category> {
    return this.categoriesService.toggleStatus(id);
  }
}
