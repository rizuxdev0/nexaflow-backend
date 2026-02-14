import { CashSession } from 'src/modules/cash-sessions/entities/cash-session.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

// Note: User sera importé du module auth quand il sera créé
@Entity('registers')
export class Register {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 50 })
  code: string;

  @Column({ length: 200 })
  location: string;

  @Column({ default: false })
  isMain: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  assignedUserId: string;

  // À décommenter quand le module User sera créé
  // @ManyToOne(() => User, { nullable: true })
  // @JoinColumn({ name: 'assignedUserId' })
  // assignedUser: User;

  @OneToMany(() => CashSession, (session) => session.register)
  sessions: CashSession[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
