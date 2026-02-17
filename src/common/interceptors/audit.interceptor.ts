import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, finalize } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';
import { AuditAction } from '../../modules/audit/entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const user = request.user;
    const url = request.url;
    const ip = request.ip;

    const userAgent =
      (request.get as (key: string) => string)?.('user-agent') ?? '';
    // Ne logger que les mutations
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      return next.handle();
    }

    const action =
      method === 'POST'
        ? AuditAction.CREATE
        : method === 'DELETE'
          ? AuditAction.DELETE
          : AuditAction.UPDATE;

    const resource = context.getClass().name.replace('Controller', '');
    const resourceId = request.params?.id;

    // Capturer les données avant modification pour PUT/PATCH
    const oldData = request.body ? { ...request.body } : null;

    return next.handle().pipe(
      finalize(() => {
        this.auditService
          .log({
            userId: user?.id,
            userName: user ? `${user.firstName} ${user.lastName}` : 'Système',
            action,
            resource,
            resourceId,
            details: `${method} ${url}`,
            oldData,
            newData: null,
            ipAddress: ip,
            userAgent,
          })
          .catch((error) => {
            console.error('Erreur audit:', error);
          });
      }),
    );
  }
}
