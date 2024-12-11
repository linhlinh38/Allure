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
import { Service } from "./service.entity";

@Entity("categories")
export class Category extends BaseEntity {
  @Column({ type: "varchar", nullable: false })
  name: string;

  @Column({ type: "int", default: 1 })
  level: number;

  @ManyToOne(() => Category, (category) => category.subCategories, {
    nullable: true,
  })
  @JoinColumn({ name: "parent_category_id" })
  parentCategory: Category;

  @OneToMany(() => Category, (category) => category.parentCategory)
  @JoinColumn({ name: "sub_categories" })
  subCategories: Category[];

  @Column({ type: "jsonb", nullable: true })
  detail: object;

  @OneToMany(() => Product, (product) => product.category)
  products: Product[];

  @OneToMany(() => Service, (service) => service.category)
  services: Product[];
}
