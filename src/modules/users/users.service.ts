import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';
import { ConfigService } from '@nestjs/config';
import { TenantService } from '../../common/tenant/tenant.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    private readonly configService: ConfigService,
    private readonly tenantService: TenantService,
  ) {}

  private get userRepo() { return this.tenantService.tenantRepo(this.usersRepository); }
  private get roleRepo() { return this.tenantService.tenantRepo(this.rolesRepository); }
  private get permissionRepo() { return this.tenantService.tenantRepo(this.permissionsRepository); }

  // ============ CRUD PRINCIPAL ============

  async create(createUserDto: CreateUserDto & Partial<User>): Promise<User> {
    // Vérifier si l'email existe déjà (Global check because of unique constraint)
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `Un utilisateur avec l'email ${createUserDto.email} existe déjà`,
      );
    }

    // Vérifier que le rôle existe
    const role = await this.roleRepo.findOne({
      where: { id: createUserDto.roleId },
    });

    if (!role) {
      throw new NotFoundException(
        `Rôle avec l'ID ${createUserDto.roleId} non trouvé`,
      );
    }

    const userData = {
      ...createUserDto,
    };

    // Hasher le mot de passe
    if (userData.password && !userData.password.startsWith('$2')) {
      const rounds = Number(this.configService.get('BCRYPT_ROUNDS', 12));
      userData.password = await bcrypt.hash(userData.password, rounds);
    }

    // Gérer les permissions supplémentaires
    const extraPermissions: Permission[] = [];
    if (createUserDto.extraPermissionIds && createUserDto.extraPermissionIds.length > 0) {
      for (const permId of createUserDto.extraPermissionIds) {
        const perm = await this.permissionRepo.findOne({ where: { id: permId } });
        if (perm) extraPermissions.push(perm);
      }
    }

    const user = this.userRepo.create({
      ...userData,
      extraPermissions,
      vendorId: this.tenantService.getVendorId() || (createUserDto as any).vendorId || undefined,
    });
    return await this.userRepo.save(user);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    roleId?: string,
    isActive?: boolean,
    roleName?: string,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const where: FindOptionsWhere<User> = {};

    if (search) {
      where.firstName = Like(`%${search}%`);
    }

    if (roleId) {
      where.roleId = roleId;
    }

    if (roleName) {
      where.role = { name: roleName };
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    // Sécurité supplémentaire : Forcer le vendorId du contexte s'il existe
    const contextVendorId = this.tenantService.getVendorId();
    if (contextVendorId) {
      where.vendorId = contextVendorId;
    }

    const [data, total] = await this.userRepo.findAndCount({
      where,
      relations: ['role', 'extraPermissions', 'vendor', 'branch'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    const usersWithoutPassword = data.map((user) =>
      this.removeSensitiveData(user),
    );
    return PaginatedResponseBuilder.build(
      usersWithoutPassword,
      total,
      page,
      pageSize,
    );
  }

  async findById(
    id: string,
    options?: { withRoleAndPermissions?: boolean },
  ): Promise<User> {
    const relations: string[] = [];
    if (options?.withRoleAndPermissions) {
      relations.push('role', 'role.permissions', 'extraPermissions', 'vendor', 'branch');
    } else {
      relations.push('vendor', 'branch');
    }

    const user = await this.userRepo.findOne({
      where: { id },
      relations,
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    if (user.role?.name === 'super_admin' && options?.withRoleAndPermissions) {
      user.role.permissions = await this.permissionsRepository.find();
    }

    return user;
  }

  async findByEmail(
    email: string,
    options?: { withRoleAndPermissions?: boolean },
  ): Promise<User> {
    const relations: string[] = [];
    if (options?.withRoleAndPermissions) {
      relations.push('role', 'role.permissions', 'extraPermissions');
    }

    // Email is global, so we use the raw repository to find the user for login
    const user = await this.usersRepository.findOne({
      where: { email },
      relations,
    });

    if (!user) {
      throw new NotFoundException(
        `Utilisateur avec l'email ${email} non trouvé`,
      );
    }

    if (user.role?.name === 'super_admin' && options?.withRoleAndPermissions) {
      user.role.permissions = await this.permissionsRepository.find();
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.findById(id);

    // Vérifier l'unicité de l'email si modifié (Global check)
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email },
      });
      if (existingUser && existingUser.id !== id) {
        throw new ConflictException(
          `Un utilisateur avec l'email ${updateUserDto.email} existe déjà`,
        );
      }
    }

    // Vérifier que le rôle existe
    if (updateUserDto.roleId && updateUserDto.roleId !== user.roleId) {
      const role = await this.roleRepo.findOne({
        where: { id: updateUserDto.roleId },
      });
      if (!role) {
        throw new NotFoundException(
          `Rôle avec l'ID ${updateUserDto.roleId} non trouvé`,
        );
      }
    }

    if (updateUserDto.password && !updateUserDto.password.startsWith('$2')) {
      const rounds = Number(this.configService.get('BCRYPT_ROUNDS', 12));
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, rounds);
    }

    if (updateUserDto.extraPermissionIds) {
      const extraPermissions: Permission[] = [];
      if (updateUserDto.extraPermissionIds.length > 0) {
        for (const permId of updateUserDto.extraPermissionIds) {
          const perm = await this.permissionRepo.findOne({ where: { id: permId } });
          if (perm) extraPermissions.push(perm);
        }
      }
      user.extraPermissions = extraPermissions;
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.userRepo.save(user);
    return this.removeSensitiveData(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);

    if (user.role?.name === 'super_admin') {
      const superAdminCount = await this.userRepo.count({
        where: { roleId: user.roleId },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException(
          'Impossible de supprimer le dernier super administrateur',
        );
      }
    }

    await this.userRepo.remove(user);
  }

  async toggleStatus(id: string): Promise<UserResponseDto> {
    const user = await this.findById(id);

    if (user.role?.name === 'super_admin' && user.isActive) {
      const superAdminCount = await this.userRepo.count({
        where: { roleId: user.roleId, isActive: true },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException(
          'Impossible de désactiver le dernier super administrateur actif',
        );
      }
    }

    user.isActive = !user.isActive;
    const updatedUser = await this.userRepo.save(user);
    return this.removeSensitiveData(updatedUser);
  }

  // ============ GESTION DES TOKENS ============

  async setRefreshToken(
    userId: string,
    hashedRefreshToken: string,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      refreshToken: hashedRefreshToken,
    });
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { refreshToken: undefined });
  }

  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    const users = await this.usersRepository.find({
      where: { refreshToken: refreshToken },
      relations: ['role', 'role.permissions', 'extraPermissions'],
    });
    const user = users[0] || null;
    if (user && user.role?.name === 'super_admin') {
      user.role.permissions = await this.permissionsRepository.find();
    }
    return user;
  }

  async setResetPasswordToken(
    userId: string,
    hashedToken: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      resetPasswordToken: hashedToken,
      resetPasswordExpires: expiresAt,
    });
  }

  async clearResetPasswordToken(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    });
  }

  async findByResetPasswordToken(token: string): Promise<User | null> {
    const users = await this.usersRepository.find({
      where: { resetPasswordToken: token },
    });
    return users[0] || null;
  }

  async setEmailVerificationToken(
    userId: string,
    token: string,
  ): Promise<void> {
    await this.usersRepository.update(userId, {
      emailVerificationToken: token,
    });
  }

  async findByEmailVerificationToken(token: string): Promise<User | null> {
    return await this.usersRepository.findOne({
      where: { emailVerificationToken: token },
    });
  }

  async verifyEmail(userId: string): Promise<void> {
    await this.usersRepository.update(userId, {
      isEmailVerified: true,
      emailVerificationToken: undefined,
    });
  }

  // ============ AUTRES MÉTHODES ============

  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { lastLoginAt: new Date() });
  }

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(userId, { password: hashedPassword });
  }

  async getUsersByRole(roleId: string): Promise<User[]> {
    const where: any = { roleId, isActive: true };
    const vendorId = this.tenantService.getVendorId();
    if (vendorId) where.vendorId = vendorId;

    return await this.userRepo.find({
      where,
      order: { firstName: 'ASC' },
    });
  }

  async getActiveUsersCount(): Promise<number> {
    const where: any = { isActive: true };
    const vendorId = this.tenantService.getVendorId();
    if (vendorId) where.vendorId = vendorId;

    return await this.userRepo.count({
      where,
    });
  }

  // ============ UTILITAIRES ============
  private removeSensitiveData(user: User): UserResponseDto {
    const {
      password,
      refreshToken,
      resetPasswordToken,
      resetPasswordExpires,
      emailVerificationToken,
      ...safeUser
    } = user;

    return {
      ...safeUser,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      vendor: user.vendor ? { id: user.vendor.id, name: user.vendor.name } : undefined,
      branch: user.branch ? { id: user.branch.id, name: user.branch.name, city: user.branch.city } : undefined,
    } as UserResponseDto;
  }
}
