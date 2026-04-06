import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<Role[]> {
    return await this.rolesRepository.find({
      order: { name: 'ASC' },
      relations: ['permissions'],
    });
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions', 'users'],
    });

    if (!role) {
      throw new NotFoundException(`Rôle avec l'ID ${id} non trouvé`);
    }

    return role;
  }

  async findByName(name: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { name },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException(`Rôle avec le nom ${name} non trouvé`);
    }

    return role;
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.rolesRepository.findOne({
      where: { name: createRoleDto.name },
    });

    if (existingRole) {
      throw new ConflictException(
        `Un rôle avec le nom ${createRoleDto.name} existe déjà`,
      );
    }

    let permissions: Permission[] = [];
    if (createRoleDto.permissionIds?.length) {
      permissions = await this.permissionsRepository.findBy({
        id: In(createRoleDto.permissionIds),
      });
    }

    const role = this.rolesRepository.create({
      name: createRoleDto.name,
      label: createRoleDto.label,
      description: createRoleDto.description,
      permissions,
      isSystem: false,
    });

    return await this.rolesRepository.save(role);
  }

  async update(id: string, updateData: Partial<Role>): Promise<Role> {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException(
        'Les rôles système ne peuvent pas être modifiés',
      );
    }

    if (updateData.name && updateData.name !== role.name) {
      const existingRole = await this.rolesRepository.findOne({
        where: { name: updateData.name },
      });
      if (existingRole && existingRole.id !== id) {
        throw new ConflictException(
          `Un rôle avec le nom ${updateData.name} existe déjà`,
        );
      }
    }

    Object.assign(role, updateData);
    return await this.rolesRepository.save(role);
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException(
        'Les rôles système ne peuvent pas être supprimés',
      );
    }

    if (role.users && role.users.length > 0) {
      throw new BadRequestException(
        `Impossible de supprimer ce rôle car ${role.users.length} utilisateur(s) y sont assignés`,
      );
    }

    await this.rolesRepository.remove(role);
  }

  async updatePermissions(
    id: string,
    updatePermissionsDto: UpdateRolePermissionsDto,
  ): Promise<Role> {
    const role = await this.findOne(id);

    if (role.isSystem && role.name !== 'super_admin') {
      throw new BadRequestException(
        'Les permissions des rôles système ne peuvent pas être modifiées',
      );
    }

    const permissions = await this.permissionsRepository.findBy({
      id: In(updatePermissionsDto.permissionIds),
    });

    role.permissions = permissions;
    return await this.rolesRepository.save(role);
  }

  getDefaultRoles(): any[] {
    return [
      {
        name: 'super_admin',
        label: 'Super Admin',
        description: 'Accès total à toutes les fonctionnalités',
        isSystem: true,
      },
      {
        name: 'admin',
        label: 'Administrateur',
        description: 'Gestion complète sauf système',
        isSystem: true,
      },
      {
        name: 'manager',
        label: 'Manager',
        description: 'Gestion stock, ventes, clients',
        isSystem: true,
      },
      {
        name: 'cashier',
        label: 'Caissier',
        description: 'POS et consultation',
        isSystem: true,
      },
      {
        name: 'customer',
        label: 'Client',
        description: 'Boutique en ligne',
        isSystem: true,
      },
    ];
  }

  async seedDefaultRoles(permissions: Permission[]): Promise<void> {
    const defaultRoles = this.getDefaultRoles();

    for (const roleData of defaultRoles) {
      let role = await this.rolesRepository.findOne({
        where: { name: roleData.name },
        relations: ['permissions'],
      });

      let rolePermissions: Permission[] = [];
      switch (roleData.name) {
        case 'super_admin':
          rolePermissions = permissions;
          break;
        case 'admin':
          rolePermissions = permissions.filter(
            (p) =>
              !p.name.startsWith('roles.') && !p.name.startsWith('settings.'),
          );
          break;
        case 'manager':
          rolePermissions = permissions.filter((p) =>
            [
              'dashboard.read',
              'products.',
              'categories.',
              'suppliers.',
              'stock.',
              'registers.',
              'pos.',
              'orders.',
              'invoices.',
              'customers.',
              'reports.',
              'marketplace.',
              'activities.read',
              'chat.',
              'banners.',
              'loyalty.',
              'promos.',
              'reviews.',
              'deliveries.',
              'stock_movements.',
              'expenses.',
            ].some((prefix) => p.name.startsWith(prefix)),
          );
          break;
        case 'cashier':
          rolePermissions = permissions.filter((p) =>
            [
              'products.read',
              'pos.',
              'registers.read',
              'orders.read',
              'invoices.read',
              'customers.read',
              'promos.read',
            ].some((prefix) => p.name.startsWith(prefix)),
          );
          break;
        case 'customer':
          rolePermissions = permissions.filter((p) =>
            ['shop.', 'orders.read', 'loyalty.read', 'wishlist.'].some((prefix) =>
              p.name.startsWith(prefix),
            ),
          );
          break;
      }

      if (!role) {
        const newRole = this.rolesRepository.create({
          name: roleData.name,
          label: roleData.label,
          description: roleData.description,
          isSystem: roleData.isSystem,
          permissions: rolePermissions,
        });
        await this.rolesRepository.save(newRole);
      } else if (['super_admin', 'admin', 'manager'].includes(role.name)) {
        // Toujours s'assurer que les rôles admin ont les dernières permissions associées
        role.permissions = rolePermissions;
        await this.rolesRepository.save(role);
      }
    }
  }
}
