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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response.interface';
import { Roles } from '../../common/decorators/roles.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@ApiTags('users')
@Controller('users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('super_admin', 'admin')
  @Permissions('users.create')
  @ApiOperation({ summary: 'Créer un nouvel utilisateur (admin)' })
  @ApiResponse({ status: 201, description: 'Utilisateur créé' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const user = await this.usersService.create(createUserDto);
    return this.usersService['removeSensitiveData'](user);
  }

  @Get()
  @Roles('super_admin', 'admin')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Liste paginée des utilisateurs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'roleId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  async findAll(
    @Query() paginationDto: PaginationDto,
    @Query('roleId') roleId?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    return this.usersService.findAll(
      paginationDto.page,
      paginationDto.pageSize,
      paginationDto.search,
      roleId,
      isActive,
    );
  }

  @Get('profile')
  @ApiOperation({ summary: "Profil de l'utilisateur connecté" })
  @ApiResponse({ status: 200, description: 'Profil récupéré' })
  getProfile(@CurrentUser() user: User): UserResponseDto {
    // ← Retourne un objet, pas une Promise
    return this.usersService['removeSensitiveData'](user);
  }

  @Get('by-role/:roleId')
  @Roles('super_admin', 'admin', 'manager')
  @Permissions('users.read')
  @ApiOperation({ summary: 'Utilisateurs par rôle' })
  @ApiParam({ name: 'roleId', description: 'ID du rôle' })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  async getByRole(@Param('roleId') roleId: string): Promise<UserResponseDto[]> {
    const users = await this.usersService.getUsersByRole(roleId);
    return users.map((user) => this.usersService['removeSensitiveData'](user));
  }

  @Get('count')
  @Roles('super_admin', 'admin')
  @Permissions('users.read')
  @ApiOperation({ summary: "Nombre total d'utilisateurs actifs" })
  @ApiResponse({ status: 200, description: 'Compteur' })
  async getCount(): Promise<{ count: number }> {
    const count = await this.usersService.getActiveUsersCount();
    return { count };
  }

  @Get(':id')
  @Roles('super_admin', 'admin')
  @Permissions('users.read')
  @ApiOperation({ summary: "Détail d'un utilisateur" })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async findOne(@Param('id') id: string): Promise<UserResponseDto> {
    const user = await this.usersService.findById(id);
    return this.usersService['removeSensitiveData'](user);
  }

  @Get('email/:email')
  @Roles('super_admin', 'admin')
  @Permissions('users.read')
  @ApiOperation({ summary: "Détail d'un utilisateur par email" })
  @ApiParam({ name: 'email', description: "Email de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async findByEmail(@Param('email') email: string): Promise<UserResponseDto> {
    const user = await this.usersService.findByEmail(email);
    return this.usersService['removeSensitiveData'](user);
  }

  @Put(':id')
  @Roles('super_admin', 'admin')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Modifier un utilisateur' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Utilisateur modifié' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @Roles('super_admin')
  @Permissions('users.delete')
  @ApiOperation({ summary: 'Supprimer un utilisateur' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({ status: 204, description: 'Utilisateur supprimé' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  @ApiResponse({
    status: 400,
    description: 'Impossible de supprimer le dernier super admin',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.usersService.remove(id);
  }

  @Patch(':id/toggle')
  @Roles('super_admin', 'admin')
  @Permissions('users.update')
  @ApiOperation({ summary: 'Activer/Désactiver un utilisateur' })
  @ApiParam({ name: 'id', description: "ID de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Statut modifié' })
  @ApiResponse({ status: 404, description: 'Utilisateur non trouvé' })
  async toggleStatus(@Param('id') id: string): Promise<UserResponseDto> {
    return this.usersService.toggleStatus(id);
  }
}
