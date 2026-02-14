import { CashSession } from 'src/modules/cash-sessions/entities/cash-session.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Ajouter ces champs à votre entité Order existante
@Entity('orders')
export class Order {
  // ... vos champs existants ...
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  sessionId: string;

  @ManyToOne(() => CashSession, { nullable: true })
  @JoinColumn({ name: 'sessionId' })
  session: CashSession;

  // ... reste des champs ...
}
