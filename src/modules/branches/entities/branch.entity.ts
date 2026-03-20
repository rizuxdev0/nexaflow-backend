import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column()
  address: string;

  @Column()
  city: string;

  @Column()
  country: string;

  @Column()
  phone: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  managerId: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isMain: boolean;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @OneToMany(() => Warehouse, (warehouse) => warehouse.branch)
  warehouses: Warehouse[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
