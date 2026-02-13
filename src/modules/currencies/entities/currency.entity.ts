// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   UpdateDateColumn,
// } from 'typeorm';

// @Entity('currencies')
// export class Currency {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ unique: true, length: 3 })
//   code: string;

//   @Column({ length: 100 })
//   name: string;

//   @Column({ length: 5 })
//   symbol: string;

//   @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
//   rate: number;

//   @Column({ default: false })
//   isDefault: boolean;

//   @Column({ default: true })
//   isActive: boolean;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('currencies')
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 3 })
  code: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 5 })
  symbol: string;

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1 })
  rate: number;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
