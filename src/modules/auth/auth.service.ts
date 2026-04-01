import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';
import { User } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { PermissionsService } from '../permissions/permissions.service';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';
import { SuppliersService } from '../suppliers/suppliers.service';

@Injectable()
export class AuthService implements OnModuleInit {
  constructor(
    private usersService: UsersService,
    private rolesService: RolesService,
    private permissionsService: PermissionsService,
    private productsService: ProductsService,
    private categoriesService: CategoriesService,
    private suppliersService: SuppliersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    try {
      // 1. Créer les permissions par défaut
      await this.permissionsService.createDefaultPermissions();
      const permissions = await this.permissionsService.findAll();

      // 2. Créer les rôles par défaut
      await this.rolesService.seedDefaultRoles(permissions as any);

      // 3. Créer l'utilisateur super admin par défaut
      const superAdminEmail = 'superadmin@nexaflow.com';
      const existingSuperAdmin = await this.usersService
        .findByEmail(superAdminEmail)
        .catch(() => null);

      if (!existingSuperAdmin) {
        const superAdminRole = await this.rolesService.findByName('super_admin');
        const hashedPassword = await bcrypt.hash(
          'super123',
          this.configService.get('BCRYPT_ROUNDS', 12),
        );

        await this.usersService.create({
          firstName: 'Ousmane',
          lastName: 'Ndiaye',
          email: superAdminEmail,
          password: hashedPassword,
          roleId: superAdminRole.id,
          isActive: true,
          isEmailVerified: true,
        });

        console.log('✅ Utilisateur Super Admin créé avec succès');
      }

      // 4. Créer une catégorie par défaut
      const defaultCategoryName = 'Électronique';
      let category = await (this.categoriesService as any).categoriesRepository.findOne({
        where: { name: defaultCategoryName },
      });

      if (!category) {
        category = await this.categoriesService.create({
          name: defaultCategoryName,
          description: 'Produits électroniques et gadgets',
          isActive: true,
        });
        console.log('✅ Catégorie par défaut créée avec succès');
      }

      // 5. Créer un fournisseur par défaut
      const defaultSupplierCode = 'SUP-TECH-001';
      let supplier = await (this.suppliersService as any).suppliersRepository.findOne({
        where: { code: defaultSupplierCode },
      });

      if (!supplier) {
        supplier = await this.suppliersService.create({
          name: 'Tech Distributeur SARL',
          contactName: 'Oumar Sall',
          code: defaultSupplierCode,
          email: 'contact@tech-distrib.com',
          phone: '+221 33 800 00 00',
          city: 'Dakar',
          country: 'Sénégal',
          address: 'Plateau, Rue 12',
          isActive: true,
        });
        console.log('✅ Fournisseur par défaut créé avec succès');
      }

      // 6. Créer un produit par défaut
      const defaultProductSku = 'IPH-15P-256';
      const existingProduct = await (this.productsService as any).productsRepository.findOne({
        where: { sku: defaultProductSku },
      });

      if (!existingProduct) {
        await this.productsService.create({
          name: 'iPhone 15 Pro',
          sku: defaultProductSku,
          description: 'Dernier iPhone avec puce A17 Pro et cadre en titane',
          price: 850000,
          costPrice: 700000,
          stock: 10,
          minStock: 2,
          maxStock: 50,
          categoryId: category.id,
          supplierId: supplier.id,
          isActive: true,
          unit: 'pièce',
          barcode: '194253702154',
          images: ['https://images.unsplash.com/photo-1696446701796-da61225697cc'],
          taxRate: 18,
          warehouseStock: { 'wh-001': 10 },
        } as any);
        console.log('✅ Produit par défaut créé avec succès');
      }
    } catch (error) {
      console.error('❌ Erreur lors de l’initialisation de l’AuthService:', error);
    }
  }

  // ============ INSCRIPTION ============

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // 1. Vérifier si l'email existe déjà
    const existingUser = await this.usersService
      .findByEmail(registerDto.email)
      .catch(() => null);
    if (existingUser) {
      throw new ConflictException('Un compte avec cet email existe déjà');
    }

    // 2. Récupérer le rôle "customer" par défaut
    const customerRole = await this.rolesService.findByName('customer');
    if (!customerRole) {
      throw new BadRequestException('Rôle client non configuré');
    }

    // 3. Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(
      registerDto.password,
      this.configService.get('BCRYPT_ROUNDS', 12),
    );

    // 4. Générer un token de vérification d'email
    const emailVerificationToken = uuidv4();

    // 5. Créer l'utilisateur
    const user = await this.usersService.create({
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      email: registerDto.email,
      password: hashedPassword,
      phone: registerDto.phone,
      roleId: customerRole.id,
      isActive: true, // À mettre false si vérification email requise
      emailVerificationToken,
    });

    // 6. TODO: Envoyer l'email de vérification
    // await this.emailService.sendVerificationEmail(user.email, emailVerificationToken);

    // 7. Générer les tokens
    return this.generateAuthResponse(user);
  }

  // ============ CONNEXION ============

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    // 1. Trouver l'utilisateur par email
    const user = await this.usersService.findByEmail(loginDto.email, {
      withRoleAndPermissions: true,
    });

    if (!user) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 2. Vérifier le mot de passe
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    //loger le email et le mot de passe pour le debug
    console.log('Email:', loginDto.email);
    console.log('Mot de passe:', loginDto.password);
    // voir le mot de passe hashé pour le debug
    console.log('Mot de passe hashé:', user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    // 3. Vérifier que le compte est actif
    if (!user.isActive) {
      throw new UnauthorizedException('Ce compte est désactivé');
    }

    // 4. Mettre à jour la dernière connexion
    await this.usersService.updateLastLogin(user.id);

    // 5. Générer les tokens
    return this.generateAuthResponse(user);
  }

  // ============ RAFRAÎCHISSEMENT DE TOKEN ============

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<AuthResponseDto> {
    const { refreshToken } = refreshTokenDto;

    // 1. Trouver l'utilisateur avec ce refresh token
    const user = await this.usersService.findByRefreshToken(refreshToken);

    if (!user) {
      throw new UnauthorizedException('Refresh token invalide');
    }

    // 2. Générer de nouveaux tokens
    return this.generateAuthResponse(user, true); // true = ne pas regénérer le refresh token en base
  }

  // ============ DÉCONNEXION ============

  async logout(userId: string): Promise<void> {
    // Invalider tous les refresh tokens
    await this.usersService.clearRefreshToken(userId);
  }

  // ============ MOT DE PASSE OUBLIÉ ============

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    try {
      const user = await this.usersService.findByEmail(email);

      // Générer un token de réinitialisation
      const resetToken = uuidv4();
      const hashedToken = await bcrypt.hash(resetToken, 10);
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Expire dans 1 heure

      await this.usersService.setResetPasswordToken(
        user.id,
        hashedToken,
        expiresAt,
      );

      // TODO: Envoyer l'email avec le token
      // await this.emailService.sendPasswordResetEmail(email, resetToken);

      return {
        message:
          'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation',
      };
    } catch (error: any) {
      // Ne pas révéler si l'email existe ou non
      return {
        message:
          'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation',
      };
    }
  }

  // ============ RÉINITIALISATION MOT DE PASSE ============

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    // Trouver l'utilisateur avec ce token
    const user = await this.usersService.findByResetPasswordToken(token);

    if (!user) {
      throw new BadRequestException('Token invalide ou expiré');
    }

    // Vérifier que le token n'est pas expiré
    if (user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Token expiré');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(
      newPassword,
      this.configService.get('BCRYPT_ROUNDS', 12),
    );

    // Mettre à jour le mot de passe et effacer le token
    await this.usersService.updatePassword(user.id, hashedPassword);
    await this.usersService.clearResetPasswordToken(user.id);

    // Invalider tous les refresh tokens
    await this.usersService.clearRefreshToken(user.id);

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  // ============ CHANGEMENT DE MOT DE PASSE (AUTHENTIFIÉ) ============

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { oldPassword, newPassword } = changePasswordDto;

    const user = await this.usersService.findById(userId);

    // Vérifier l'ancien mot de passe
    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }

    // Hasher le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(
      newPassword,
      this.configService.get('BCRYPT_ROUNDS', 12),
    );

    // Mettre à jour le mot de passe
    await this.usersService.updatePassword(userId, hashedPassword);

    // Invalider tous les refresh tokens (sauf la session courante ?)
    await this.usersService.clearRefreshToken(userId);

    return { message: 'Mot de passe changé avec succès' };
  }

  // ============ VÉRIFICATION EMAIL ============

  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmailVerificationToken(token);

    if (!user) {
      throw new BadRequestException('Token de vérification invalide');
    }

    await this.usersService.verifyEmail(user.id);

    return { message: 'Email vérifié avec succès' };
  }

  // ============ UTILITAIRES ============

  private async generateAuthResponse(
    user: User,
    keepSameRefreshToken = false,
  ): Promise<AuthResponseDto> {
    // Préparer le payload JWT
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name,
    };

    // Générer le JWT
    const token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '1h'),
    });

    // Générer ou réutiliser le refresh token
    let refreshToken: string;

    if (keepSameRefreshToken && user.refreshToken) {
      refreshToken = user.refreshToken;
    } else {
      refreshToken = uuidv4();
      const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
      await this.usersService.setRefreshToken(user.id, hashedRefreshToken);
    }

    // Retourner la réponse sans le mot de passe
    // const { password, ...userWithoutPassword } = user;
    const { password: _, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword as any,
      token,
      refreshToken,
    };
  }
}
