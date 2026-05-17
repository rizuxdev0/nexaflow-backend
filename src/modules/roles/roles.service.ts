import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, Brackets } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';
import { TenantService } from '../../common/tenant/tenant.service';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    private readonly tenantService: TenantService,
  ) {}

  private get baseRepo() {
    return this.rolesRepository;
  }

  private get vendorId() {
    return this.tenantService.getVendorId();
  }

  async findAll(): Promise<Role[]> {
    const query = this.baseRepo.createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .orderBy('role.name', 'ASC');

    if (this.vendorId) {
      query.andWhere(new Brackets(qb => {
        qb.where('role.vendorId = :vendorId', { vendorId: this.vendorId })
          .orWhere('role.isSystem = true');
      }));
    }

    const roles = await query.getMany();

    // Inject all permissions for super_admin
    const superAdmin = roles.find(r => r.name === 'super_admin');
    if (superAdmin) {
      superAdmin.permissions = await this.permissionsRepository.find();
    }

    return roles;
  }

  async findOne(id: string): Promise<Role> {
    const query = this.baseRepo.createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .leftJoinAndSelect('role.users', 'users')
      .where('role.id = :id', { id });

    if (this.vendorId) {
      query.andWhere(new Brackets(qb => {
        qb.where('role.vendorId = :vendorId', { vendorId: this.vendorId })
          .orWhere('role.isSystem = true');
      }));
    }

    const role = await query.getOne();
    if (!role) {
      throw new NotFoundException(`Rôle avec l'ID ${id} non trouvé`);
    }

    if (role.name === 'super_admin') {
      role.permissions = await this.permissionsRepository.find();
    }

    return role;
  }

  async findByName(name: string): Promise<Role> {
    const query = this.baseRepo.createQueryBuilder('role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('role.name = :name', { name });

    if (this.vendorId) {
      query.andWhere(new Brackets(qb => {
        qb.where('role.vendorId = :vendorId', { vendorId: this.vendorId })
          .orWhere('role.isSystem = true');
      }));
    }

    const role = await query.getOne();
    if (!role) {
      throw new NotFoundException(`Rôle avec le nom ${name} non trouvé`);
    }

    if (role.name === 'super_admin') {
      role.permissions = await this.permissionsRepository.find();
    }

    return role;
  }

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const existingRole = await this.baseRepo.createQueryBuilder('role')
      .where('role.name = :name', { name: createRoleDto.name })
      .andWhere(new Brackets(qb => {
        qb.where('role.vendorId = :vendorId', { vendorId: this.vendorId })
          .orWhere('role.isSystem = true');
      }))
      .getOne();

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

    const role = this.baseRepo.create({
      ...createRoleDto,
      permissions,
      isSystem: false,
      vendorId: this.vendorId || undefined,
    });

    return await this.baseRepo.save(role);
  }

  async update(id: string, updateData: Partial<Role>): Promise<Role> {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException(
        'Les rôles système ne peuvent pas être modifiés',
      );
    }

    if (updateData.name && updateData.name !== role.name) {
       const existingRole = await this.baseRepo.createQueryBuilder('role')
        .where('role.name = :name', { name: updateData.name })
        .andWhere(new Brackets(qb => {
          qb.where('role.vendorId = :vendorId', { vendorId: this.vendorId })
            .orWhere('role.isSystem = true');
        }))
        .getOne();

      if (existingRole && existingRole.id !== id) {
        throw new ConflictException(
          `Un rôle avec le nom ${updateData.name} existe déjà`,
        );
      }
    }

    Object.assign(role, updateData);
    return await this.baseRepo.save(role);
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

    await this.baseRepo.remove(role);
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
    return await this.baseRepo.save(role);
  }

  /**
   * Seeds default system roles with strictly partitioned permissions.
   */
  async seedDefaultRoles(permissions: Permission[]): Promise<void> {
    const defaultRoles = [
      { name: 'super_admin', label: 'Super Admin', description: 'Accès total à la plateforme', isSystem: true },
      { name: 'admin', label: 'Administrateur Boutique', description: 'Gestion complète de sa boutique', isSystem: true },
      { name: 'manager', label: 'Manager', description: 'Gestion stock et ventes', isSystem: true },
      { name: 'cashier', label: 'Caissier', description: 'Point de vente uniquement', isSystem: true },
      { name: 'customer', label: 'Client', description: 'Client ecommerce', isSystem: true },
      { name: 'vendor', label: 'Vendeur Marketplace', description: 'Espace vendeur sur la marketplace', isSystem: true },
    ];

    // Resources that are STRICTLY reserved for SuperAdmin (platform level)
    const superAdminOnlyResources = [
      'roles',          // Management of system roles
      'marketplace',    // Management of the whole marketplace
      'vendors',        // Management of all vendors
      'subscriptions',  // Management of platform subscription plans
    ];

    for (const roleData of defaultRoles) {
      let role = await this.baseRepo.findOne({
        where: { name: roleData.name, isSystem: true },
        relations: ['permissions'],
      });

      let rolePermissions: Permission[] = [];
      
      if (roleData.name === 'super_admin') {
        // Super Admin gets EVERYTHING
        rolePermissions = permissions;
      } 
      else if (roleData.name === 'admin') {
        // Vendor Admin gets everything EXCEPT platform-level management
        rolePermissions = permissions.filter(p => {
          const isSystemOnly = superAdminOnlyResources.some(res => p.name.startsWith(res));
          return !isSystemOnly;
        });
        
        // However, they still need to READ their own subscription/config
        // (but not manage the plans)
        const subRead = permissions.find(p => p.name === 'subscriptions.read');
        const configRead = permissions.find(p => p.name === 'store_config.read');
        const configUpdate = permissions.find(p => p.name === 'store_config.update');
        
        if (subRead) rolePermissions.push(subRead);
        if (configRead) rolePermissions.push(configRead);
        if (configUpdate) rolePermissions.push(configUpdate);
      }
      else if (roleData.name === 'manager') {
        // Manager gets operational permissions
        const allowedResources = ['products', 'categories', 'suppliers', 'stock', 'orders', 'invoices', 'customers', 'pos'];
        rolePermissions = permissions.filter(p => allowedResources.includes(p.resource));
      }
      else if (roleData.name === 'cashier') {
        // Cashier only gets POS and reading related data
        const allowedResources = ['pos', 'orders', 'products', 'customers'];
        rolePermissions = permissions.filter(p => allowedResources.includes(p.resource) && p.action === 'read' || p.resource === 'pos');
      }
      else if (roleData.name === 'vendor') {
        // Vendor gets only their own marketplace-related resources
        const allowedVendorResources = ['shop', 'orders', 'vendors', 'products', 'reports', 'chat'];
        rolePermissions = permissions.filter(p =>
          allowedVendorResources.includes(p.resource) &&
          ['read', 'create', 'update'].includes(p.action)
        );
      }

      if (!role) {
        role = this.baseRepo.create({
          ...roleData,
          permissions: rolePermissions,
        });
        await this.baseRepo.save(role);
      } else {
        // Update existing system roles with new permission logic
        role.permissions = rolePermissions;
        await this.baseRepo.save(role);
      }
    }
  }
}
