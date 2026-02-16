import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { PermissionResponseDto } from './dto/permission-response.dto';
import { resources } from 'src/common/variable/global';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async findAll(): Promise<PermissionResponseDto[]> {
    const permissions = await this.permissionsRepository.find({
      order: { resource: 'ASC', action: 'ASC' },
    });
    return permissions;
  }

  async findOne(id: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!permission) {
      throw new NotFoundException(`Permission avec l'ID ${id} non trouvée`);
    }

    return permission;
  }

  async findByName(name: string): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { name },
    });

    if (!permission) {
      throw new NotFoundException(`Permission avec le nom ${name} non trouvée`);
    }

    return permission;
  }

  async findByResource(resource: string): Promise<Permission[]> {
    return await this.permissionsRepository.find({
      where: { resource },
      order: { action: 'ASC' },
    });
  }

  async getGroupedByResource(): Promise<Record<string, Permission[]>> {
    const permissions = await this.permissionsRepository.find({
      order: { resource: 'ASC', action: 'ASC' },
    });

    const grouped = {};
    permissions.forEach((permission) => {
      if (!grouped[permission.resource]) {
        grouped[permission.resource] = [];
      }
      grouped[permission.resource].push(permission);
    });

    return grouped;
  }

  async createDefaultPermissions(): Promise<void> {
    const count = await this.permissionsRepository.count();
    if (count > 0) return;

    const actions = ['create', 'read', 'update', 'delete', 'manage'];

    const permissions: Partial<Permission>[] = [];

    for (const resource of resources) {
      for (const action of actions) {
        permissions.push({
          name: `${resource}.${action}`,
          resource,
          action,
          description: `Peut ${action === 'manage' ? 'gérer' : action} ${resource}`,
        });
      }
    }

    await this.permissionsRepository.save(permissions);
  }
}
