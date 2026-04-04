import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity('return_policy')
export class ReturnPolicy {
  @PrimaryColumn()
  id: string;

  @Column({ type: 'jsonb', default: {} })
  config: Record<string, any>;

  @UpdateDateColumn()
  updatedAt: Date;
}
