import {
  EntitySubscriberInterface,
  EventSubscriber,
  InsertEvent,
  UpdateEvent,
  DataSource,
} from 'typeorm';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { TenantService } from './tenant.service';

@EventSubscriber()
@Injectable()
export class TenantSubscriber implements EntitySubscriberInterface {
  constructor(
    private readonly dataSource: DataSource,
    private readonly tenantService: TenantService,
  ) {
    this.dataSource.subscribers.push(this);
  }

  /**
   * Appliqué après le chargement de toute entité.
   * Sécurité ultime : empêche la fuite de données si un filtre a été oublié.
   */
  afterLoad(entity: any) {
    if (!entity || typeof entity !== 'object') return;

    const vendorId = this.tenantService.getVendorId();
    // On ne vérifie que si un vendorId est présent dans le contexte (utilisateurs loggués)
    // et si l'entité possède un champ vendorId.
    if (vendorId && 'vendorId' in entity && entity.vendorId) {
      if (entity.vendorId !== vendorId) {
        throw new ForbiddenException('Violation de l\'isolation des données (Tenant Mismatch)');
      }
    }
  }

  /**
   * Appliqué automatiquement avant chaque insertion.
   */
  beforeInsert(event: InsertEvent<any>) {
    this.injectVendorId(event.entity);
  }

  /**
   * Appliqué automatiquement avant chaque mise à jour.
   */
  beforeUpdate(event: UpdateEvent<any>) {
    this.injectVendorId(event.entity);
  }

  private injectVendorId(entity: any) {
    if (!entity) return;

    if ('vendorId' in entity) {
      const vendorId = this.tenantService.getVendorId();
      if (vendorId && (entity.vendorId === null || entity.vendorId === undefined)) {
        entity.vendorId = vendorId;
      }
    }
  }
}
