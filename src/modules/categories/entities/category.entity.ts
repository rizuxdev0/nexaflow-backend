// import { Product } from 'src/modules/products/entities/product.entity';
// import {
//   Entity,
//   PrimaryGeneratedColumn,
//   Column,
//   CreateDateColumn,
//   UpdateDateColumn,
//   OneToMany,
//   JoinColumn,
//   ManyToOne,
// } from 'typeorm';

// @Entity('categories')
// export class Category {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ length: 100 })
//   name: string;

//   @Column({ unique: true, length: 100 })
//   slug: string;

//   @Column({ type: 'text', nullable: true })
//   description: string;

//   @Column({ nullable: true })
//   parentId: string;

//   @ManyToOne(() => Category, { nullable: true })
//   @JoinColumn({ name: 'parentId' })
//   parent: Category;

//   @Column({ nullable: true })
//   image: string;

//   @Column({ default: true })
//   isActive: boolean;

//   @OneToMany(() => Product, (product) => product.category)
//   products: Product[];

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
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from '../../products/entities/product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 100 })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  parentId: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: 'parentId' })
  parent: Category;

  @OneToMany(() => Category, (category) => category.parent)
  children: Category[];

  @Column({ nullable: true })
  image: string;

  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
