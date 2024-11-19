import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Category } from "./category.entity";
import { Brand } from "./brand.entity";
import { StatusEnum } from "../utils/enum";
import { ProductClassification } from "./productClassification";
import { ProductImage } from "./productImage.entity";

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  name: string;

  @ManyToOne(() => Brand, { nullable: false })
  @JoinColumn({ name: "brandId" })
  brand: Brand;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: "categoryId" })
  category: Category;

  @Column({ type: "varchar", nullable: true })
  description: string;

  @Column({ type: "varchar", nullable: true })
  detail: string;

  @Column({ type: "int", nullable: false })
  price: number;

  @Column({ type: "int", nullable: false })
  quantity: number;

  @OneToMany(
    () => ProductClassification,
    (productClassification) => productClassification.product
  )
  @JoinColumn({ name: "productClassifications" })
  productClassifications: ProductClassification[];

  @OneToMany(() => ProductImage, (image) => image.product, { nullable: true })
  @JoinColumn({ name: "productImages" })
  images?: ProductImage[];

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
