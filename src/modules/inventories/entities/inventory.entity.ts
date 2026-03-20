import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Warehouse } from '../../warehouses/entities/warehouse.entity';

export enum InventoryCountStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface InventoryCountItem {
  productId: string;
  productName: string;
  sku: string;
  expectedQuantity: number;
  countedQuantity: number;
  variance: number;
  batchNumber?: string;
}

@Entity('inventory_counts')
export class InventoryCount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  reference: string;

  @ManyToOne(() => Warehouse)
  @JoinColumn({ name: 'warehouseId' })
  warehouse: Warehouse;

  @Column()
  warehouseId: string;

  @Column({
    type: 'enum',
    enum: InventoryCountStatus,
    default: InventoryCountStatus.PLANNED,
  })
  status: InventoryCountStatus;

  @Column()
  scheduledDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedDate: Date | null;

  @Column({ type: 'varchar', nullable: true })
  countedBy: string | null;

  @Column({ type: 'jsonb' })
  items: InventoryCountItem[];

  @Column({ type: 'int', default: 0 })
  totalVariance: number;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
