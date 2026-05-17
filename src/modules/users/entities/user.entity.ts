import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Permission } from '../../permissions/entities/permission.entity';
import { CashSession } from '../../cash-sessions/entities/cash-session.entity';
import { Order } from '../../orders/entities/order.entity';
import { Vendor } from '../../vendors/entities/vendor.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string; // hashé

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEmailVerified: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column({ nullable: true })
  refreshToken: string; // hash du refresh token

  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ nullable: true })
  resetPasswordExpires: Date;

  @Column({ nullable: true })
  emailVerificationToken: string;

  @ManyToOne(() => Role)
  @JoinColumn({ name: 'roleId' })
  role: Role;

  @Column()
  roleId: string;

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendorId' })
  vendor: Vendor;

  @Column({ nullable: true })
  vendorId: string;

  @ManyToOne(() => Branch, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;

  @Column({ nullable: true })
  branchId: string;
  
  @ManyToMany(() => Permission)
  @JoinTable({ name: 'user_extra_permissions' })
  extraPermissions: Permission[];

  @OneToMany(() => CashSession, (session) => session.user)
  cashSessions: CashSession[];

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('SubscriptionPlan', { nullable: true })
  @JoinColumn({ name: 'subscriptionPlanId' })
  subscriptionPlan: any;

  @Column({ nullable: true })
  subscriptionPlanId: string;

  @Column({ type: 'timestamp', nullable: true })
  subscriptionExpiresAt: Date;

  // Propriétés calculées
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
