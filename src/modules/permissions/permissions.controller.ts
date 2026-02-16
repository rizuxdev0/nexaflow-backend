import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PermissionsService } from './permissions.service';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';

@ApiTags('permissions')
@Controller('permissions')
@ApiBearerAuth()
@Roles('super_admin', 'admin')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Liste de toutes les permissions' })
  @ApiResponse({ status: 200, description: 'Liste des permissions' })
  async findAll(): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findAll();
  }

  @Get('grouped')
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Permissions groupées par ressource' })
  @ApiResponse({ status: 200, description: 'Permissions groupées' })
  async getGrouped(): Promise<Record<string, PermissionResponseDto[]>> {
    return this.permissionsService.getGroupedByResource();
  }

  @Get('resource/:resource')
  @Permissions('roles.read')
  @ApiOperation({ summary: 'Permissions par ressource' })
  @ApiParam({ name: 'resource', description: 'Nom de la ressource' })
  @ApiResponse({ status: 200, description: 'Liste des permissions' })
  async findByResource(
    @Param('resource') resource: string,
  ): Promise<PermissionResponseDto[]> {
    return this.permissionsService.findByResource(resource);
  }

  @Get(':id')
  @Permissions('roles.read')
  @ApiOperation({ summary: "Détail d'une permission" })
  @ApiParam({ name: 'id', description: 'ID de la permission' })
  @ApiResponse({ status: 200, description: 'Permission trouvée' })
  @ApiResponse({ status: 404, description: 'Permission non trouvée' })
  async findOne(@Param('id') id: string): Promise<PermissionResponseDto> {
    return this.permissionsService.findOne(id);
  }

  @Get('name/:name')
  @Permissions('roles.read')
  @ApiOperation({ summary: "Détail d'une permission par son nom" })
  @ApiParam({ name: 'name', description: 'Nom de la permission' })
  @ApiResponse({ status: 200, description: 'Permission trouvée' })
  @ApiResponse({ status: 404, description: 'Permission non trouvée' })
  async findByName(
    @Param('name') name: string,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.findByName(name);
  }
}
