import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('delivery_zones')
export class DeliveryZone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'simple-array' })
  cities: string[];

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  baseFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  freeAbove: number;

  @Column({ type: 'jsonb' })
  estimatedDays: { min: number; max: number };

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  weightSurcharge: number; // per kg

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
