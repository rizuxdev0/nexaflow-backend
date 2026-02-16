import { DataSource } from 'typeorm';
import { PermissionsService } from '../../modules/permissions/permissions.service';
import { RolesService } from '../../modules/roles/roles.service';

export async function seedPermissionsAndRoles(dataSource: DataSource) {
  const permissionsService = new PermissionsService(
    dataSource.getRepository('Permission'),
  );
  const rolesService = new RolesService(
    dataSource.getRepository('Role'),
    dataSource.getRepository('Permission'),
  );

  // Créer les permissions par défaut
  await permissionsService.createDefaultPermissions();

  // Récupérer toutes les permissions
  const permissions = await permissionsService.findAll();

  // Créer les rôles par défaut avec leurs permissions
  await rolesService.seedDefaultRoles(permissions as any);

  console.log('✅ Permissions et rôles par défaut créés');
}
