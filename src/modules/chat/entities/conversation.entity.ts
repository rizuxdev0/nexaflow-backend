import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  customerId: string;

  @Column()
  customerName: string;

  @Column({ nullable: true })
  customerEmail: string;

  @Column({ default: 'active' })
  status: 'active' | 'closed';

  @Column({ nullable: true })
  lastMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];
}
