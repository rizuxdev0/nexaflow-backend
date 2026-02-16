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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import {
  PaginatedResponse,
  PaginatedResponseBuilder,
} from '../../common/interfaces/paginated-response.interface';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
  ) {}

  // ============ CRUD PRINCIPAL ============

  // async create(createUserDto: CreateUserDto): Promise<User> {
  //   // Vérifier si l'email existe déjà
  //   const existingUser = await this.usersRepository.findOne({
  //     where: { email: createUserDto.email },
  //   });

  //   if (existingUser) {
  //     throw new ConflictException(
  //       `Un utilisateur avec l'email ${createUserDto.email} existe déjà`,
  //     );
  //   }

  //   // Vérifier que le rôle existe
  //   const role = await this.rolesRepository.findOne({
  //     where: { id: createUserDto.roleId },
  //   });

  //   if (!role) {
  //     throw new NotFoundException(
  //       `Rôle avec l'ID ${createUserDto.roleId} non trouvé`,
  //     );
  //   }

  //   // Hasher le mot de passe
  //   const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

  //   const user = this.usersRepository.create({
  //     ...createUserDto,
  //     password: hashedPassword,
  //   });

  //   return await this.usersRepository.save(user);
  // }
  // Dans users.service.ts - Modifier la méthode create
  async create(createUserDto: CreateUserDto & Partial<User>): Promise<User> {
    // Vérifier si l'email existe déjà
    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(
        `Un utilisateur avec l'email ${createUserDto.email} existe déjà`,
      );
    }

    // Vérifier que le rôle existe
    const role = await this.rolesRepository.findOne({
      where: { id: createUserDto.roleId },
    });

    if (!role) {
      throw new NotFoundException(
        `Rôle avec l'ID ${createUserDto.roleId} non trouvé`,
      );
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    const userData = {
      ...createUserDto,
      password: hashedPassword,
    };

    const user = this.usersRepository.create(userData);
    return await this.usersRepository.save(user);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 20,
    search?: string,
    roleId?: string,
    isActive?: boolean,
  ): Promise<PaginatedResponse<UserResponseDto>> {
    const where: FindOptionsWhere<User> = {};

    if (search) {
      where.firstName = Like(`%${search}%`);
      // Note: Pour une recherche plus poussée, utiliser QueryBuilder
    }

    if (roleId) {
      where.roleId = roleId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [data, total] = await this.usersRepository.findAndCount({
      where,
      relations: ['role'],
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
      relations.push('role', 'role.permissions');
    }

    const user = await this.usersRepository.findOne({
      where: { id },
      relations,
    });

    if (!user) {
      throw new NotFoundException(`Utilisateur avec l'ID ${id} non trouvé`);
    }

    return user;
  }

  async findByEmail(
    email: string,
    options?: { withRoleAndPermissions?: boolean },
  ): Promise<User> {
    const relations: string[] = [];
    if (options?.withRoleAndPermissions) {
      relations.push('role', 'role.permissions');
    }

    const user = await this.usersRepository.findOne({
      where: { email },
      relations,
    });

    if (!user) {
      throw new NotFoundException(
        `Utilisateur avec l'email ${email} non trouvé`,
      );
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.findById(id);

    // Vérifier l'unicité de l'email si modifié
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

    // Vérifier que le rôle existe si modifié
    if (updateUserDto.roleId && updateUserDto.roleId !== user.roleId) {
      const role = await this.rolesRepository.findOne({
        where: { id: updateUserDto.roleId },
      });
      if (!role) {
        throw new NotFoundException(
          `Rôle avec l'ID ${updateUserDto.roleId} non trouvé`,
        );
      }
    }

    // Si le mot de passe est fourni, le hasher
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 12);
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);
    return this.removeSensitiveData(updatedUser);
  }

  async remove(id: string): Promise<void> {
    const user = await this.findById(id);

    // Empêcher la suppression du dernier super_admin
    if (user.role?.name === 'super_admin') {
      const superAdminCount = await this.usersRepository.count({
        where: { roleId: user.roleId },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException(
          'Impossible de supprimer le dernier super administrateur',
        );
      }
    }

    await this.usersRepository.remove(user);
  }

  async toggleStatus(id: string): Promise<UserResponseDto> {
    const user = await this.findById(id);

    // Empêcher la désactivation du dernier super_admin
    if (user.role?.name === 'super_admin' && user.isActive) {
      const superAdminCount = await this.usersRepository.count({
        where: { roleId: user.roleId, isActive: true },
      });
      if (superAdminCount <= 1) {
        throw new BadRequestException(
          'Impossible de désactiver le dernier super administrateur actif',
        );
      }
    }

    user.isActive = !user.isActive;
    const updatedUser = await this.usersRepository.save(user);
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
    // Note: On ne peut pas rechercher par hash directement, donc on doit itérer
    // Dans un cas réel, stocker le hash et comparer
    const users = await this.usersRepository.find({
      where: { refreshToken: refreshToken }, // À remplacer par une vraie recherche de hash
      relations: ['role', 'role.permissions'],
    });
    return users[0] || null;
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
    // Dans un cas réel, comparer les hashs
    const users = await this.usersRepository.find({
      where: { resetPasswordToken: token }, // À remplacer par une vraie comparaison
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
    return await this.usersRepository.find({
      where: { roleId, isActive: true },
      order: { firstName: 'ASC' },
    });
  }

  async getActiveUsersCount(): Promise<number> {
    return await this.usersRepository.count({
      where: { isActive: true },
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

    // Ajouter la propriété calculée fullName
    return {
      ...safeUser,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
    } as UserResponseDto;
  }
  // private removeSensitiveData(user: User): UserResponseDto {
  //   const {
  //     password,
  //     refreshToken,
  //     resetPasswordToken,
  //     resetPasswordExpires,
  //     emailVerificationToken,
  //     ...safeUser
  //   } = user;
  //   return safeUser as UserResponseDto;
  // }
}
