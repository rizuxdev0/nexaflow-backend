import { Repository, ObjectLiteral } from 'typeorm';
import { TenantService } from './tenant.service';
import { NotFoundException } from '@nestjs/common';

/**
 * Abstract base class for services that require automatic multi-tenant isolation.
 * It provides a proxied 'repo' that automatically filters by vendorId.
 */
export abstract class AbstractTenantService<T extends { id: string; vendorId?: string }> {
  constructor(
    protected readonly baseRepository: Repository<T>,
    protected readonly tenantService: TenantService,
    protected readonly resourceName: string = 'Resource'
  ) {}

  /**
   * The proxied repository that automatically injects vendorId into queries.
   */
  protected get repo(): Repository<T> {
    return this.tenantService.tenantRepo(this.baseRepository);
  }

  /**
   * Standard find all for the current tenant.
   */
  async findAll(...args: any[]): Promise<any> {
    return this.repo.find(args[0] || {});
  }

  /**
   * Standard find one by ID for the current tenant.
   */
  async findOne(...args: any[]): Promise<any> {
    const id = args[0] as string;
    const relations = args[1] || [];
    const item = await this.repo.findOne({ 
      where: { id } as any,
      relations 
    });
    if (!item) throw new NotFoundException(`${this.resourceName} not found or access denied`);
    return item;
  }

  /**
   * Standard remove for the current tenant.
   */
  async remove(...args: any[]): Promise<any> {
    const id = args[0] as string;
    const item = await this.findOne(id);
    return this.repo.remove(item);
  }

  /**
   * Helper to wrap any other repository with tenant isolation.
   */
  protected tenantRepo<R extends ObjectLiteral>(repository: Repository<R>): Repository<R> {
    return this.tenantService.tenantRepo(repository);
  }
}
