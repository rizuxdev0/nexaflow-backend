import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { StoreConfig } from '../store-config/entities/store-config.entity';
import { Currency } from '../currencies/entities/currency.entity';
import { InitializeSystemDto } from './dto/initialize-system.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { RolesService } from '../roles/roles.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SetupService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(StoreConfig)
    private readonly configRepository: Repository<StoreConfig>,
    @InjectRepository(Currency)
    private readonly currencyRepository: Repository<Currency>,
    private readonly permissionsService: PermissionsService,
    private readonly rolesService: RolesService,
    private readonly dataSource: DataSource,
  ) {}

  async getStatus() {
    const adminRole = await this.roleRepository.findOne({ where: { name: 'super_admin' } });
    let adminExists = false;
    
    if (adminRole) {
      const count = await this.userRepository.count({ where: { roleId: adminRole.id } });
      adminExists = count > 0;
    }

    const configCount = await this.configRepository.count();

    return {
      initialized: adminExists && configCount > 0,
      steps: {
        database: true, // If we're here, DB is connected
        permissions: !!adminRole,
        adminAccount: adminExists,
        storeConfig: configCount > 0,
      }
    };
  }

  async initialize(dto: InitializeSystemDto) {
    const status = await this.getStatus();
    if (status.initialized) {
      throw new ConflictException('Le système est déjà initialisé');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Seed Permissions & Roles if missing
      await this.permissionsService.createDefaultPermissions();
      const allPermissions = await this.permissionRepository.find();
      await this.rolesService.seedDefaultRoles(allPermissions);

      // 2. Get Super Admin Role
      const superAdminRole = await this.roleRepository.findOne({ where: { name: 'super_admin' } });
      if (!superAdminRole) throw new Error('Role super_admin not found after seeding');

      // 3. Create Admin User
      const hashedPassword = await bcrypt.hash(dto.adminPassword, 10);
      const admin = this.userRepository.create({
        firstName: dto.adminFirstName,
        lastName: dto.adminLastName,
        email: dto.adminEmail,
        password: hashedPassword,
        roleId: superAdminRole.id,
        isActive: true,
        isEmailVerified: true,
      });
      await queryRunner.manager.save(admin);

      // 4. Create Initial Currency (XOF or user defined)
      const currency = this.currencyRepository.create({
        code: dto.currencyCode,
        name: dto.currencyCode,
        symbol: dto.currencySymbol,
        exchangeRate: 1,
        isBase: true,
        isActive: true,
      });
      await queryRunner.manager.save(currency);

      // 5. Create Store Config
      const config = this.configRepository.create({
        identity: {
          storeName: dto.storeName,
          storeSlogan: dto.storeSlogan || '',
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone,
          contactAddress: dto.contactAddress,
          city: dto.city,
          country: dto.country,
          currency: dto.currencyCode,
          currencySymbol: dto.currencySymbol,
          logoUrl: '',
          faviconUrl: '',
          socialLinks: { facebook: '', instagram: '', whatsapp: dto.contactPhone, twitter: '', tiktok: '' }
        },
        appearance: {
          theme: 'blue',
          darkMode: false,
          language: dto.language,
        },
        checkout: {
          guestCheckoutEnabled: true,
          minimumOrderAmount: 0,
          paymentMethods: [],
          tax: { defaultTaxRate: 18, taxLabel: 'TVA', pricesIncludeTax: false, taxId: '' }
        },
        subscriptionPlan: 'starter' as any,
        subscriptionStatus: 'active',
        features: [], // Will be filled by default in service if empty
        security: {
          jwtExpiresIn: '24h',
          idleTimeoutMinutes: 30,
          autoLockEnabled: true,
          passwordPolicy: {
            minLength: 8,
            maxLength: 128,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecialChars: false,
            preventCommonPasswords: true,
            expirationDays: 0,
          }
        }
      });
      await queryRunner.manager.save(config);

      await queryRunner.commitTransaction();
      return { success: true, message: 'Système initialisé avec succès' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException(`Erreur d'initialisation: ${err.message}`);
    } finally {
      await queryRunner.release();
    }
  }
}
