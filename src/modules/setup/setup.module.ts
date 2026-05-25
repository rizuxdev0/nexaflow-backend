import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SetupService } from './setup.service';
import { SetupController } from './setup.controller';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { StoreConfig } from '../store-config/entities/store-config.entity';
import { Currency } from '../currencies/entities/currency.entity';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, Permission, StoreConfig, Currency]),
    PermissionsModule,
    RolesModule,
  ],
  controllers: [SetupController],
  providers: [SetupService],
})
export class SetupModule {}
