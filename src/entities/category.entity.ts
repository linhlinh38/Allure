import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { Product } from "./product.entity";

@Entity("categories")
export class Category extends BaseEntity {
  @Column({ type: "varchar", nullable: false })
  name: string;

  @ManyToOne(() => Category, (category) => category.subCategories, {
    nullable: true,
  })
  @JoinColumn({ name: "parent_category_id" })
  parentCategory: Category;

  @OneToMany(() => Category, (category) => category.parentCategory)
  @JoinColumn({ name: "sub_categories" })
  subCategories: Category[];

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];
}
