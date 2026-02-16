import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { Role } from './entities/role.entity';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('roles')
@Controller('roles')
@ApiBearerAuth()
@Roles('super_admin') // Seul super_admin peut accéder à ce contrôleur
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions('roles.create')
  @ApiOperation({ summary: 'Créer un nouveau rôle' })
  @ApiResponse({ status: 201, description: 'Rôle créé' })
  @ApiResponse({ status: 409, description: 'Nom déjà utilisé' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createRoleDto: CreateRoleDto): Promise<Role> {
    return this.rolesService.create(createRoleDto);
  }

  @Get()
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Liste de tous les rôles' })
  @ApiResponse({ status: 200, description: 'Liste des rôles' })
  async findAll(): Promise<Role[]> {
    return this.rolesService.findAll();
  }

  @Get(':id')
  @Permissions('roles.read')
  @ApiOperation({ summary: "Détail d'un rôle" })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({ status: 200, description: 'Rôle trouvé' })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  async findOne(@Param('id') id: string): Promise<Role> {
    return this.rolesService.findOne(id);
  }

  @Get('name/:name')
  @Permissions('roles.read')
  @ApiOperation({ summary: "Détail d'un rôle par son nom" })
  @ApiParam({ name: 'name', description: 'Nom du rôle' })
  @ApiResponse({ status: 200, description: 'Rôle trouvé' })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  async findByName(@Param('name') name: string): Promise<Role> {
    return this.rolesService.findByName(name);
  }

  @Put(':id')
  @Permissions('roles.update')
  @ApiOperation({ summary: 'Modifier un rôle' })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({ status: 200, description: 'Rôle modifié' })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  @ApiResponse({ status: 400, description: 'Rôle système non modifiable' })
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<Role>,
  ): Promise<Role> {
    return this.rolesService.update(id, updateData);
  }

  @Delete(':id')
  @Permissions('roles.delete')
  @ApiOperation({ summary: 'Supprimer un rôle' })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({ status: 204, description: 'Rôle supprimé' })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  @ApiResponse({ status: 400, description: 'Rôle système non supprimable' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.rolesService.remove(id);
  }

  @Put(':id/permissions')
  @Permissions('roles.update')
  @ApiOperation({ summary: "Mettre à jour les permissions d'un rôle" })
  @ApiParam({ name: 'id', description: 'ID du rôle' })
  @ApiResponse({ status: 200, description: 'Permissions mises à jour' })
  @ApiResponse({ status: 404, description: 'Rôle non trouvé' })
  @ApiResponse({ status: 400, description: 'Rôle système non modifiable' })
  async updatePermissions(
    @Param('id') id: string,
    @Body() updatePermissionsDto: UpdateRolePermissionsDto,
  ): Promise<Role> {
    return this.rolesService.updatePermissions(id, updatePermissionsDto);
  }
}
