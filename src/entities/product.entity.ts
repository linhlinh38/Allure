import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
} from "typeorm";
import { Category } from "./category.entity";
import { Brand } from "./brand.entity";
import { ProductEnum } from "../utils/enum";
import { ProductClassification } from "./productClassification.entity";
import { ProductImage } from "./productImage.entity";
import { BaseEntity } from "./base.entity";
import { PreOrderProduct } from "./preOrderProduct.entity";
import { ProductDiscount } from "./productDiscount.entity";
import { GroupProduct } from "./groupProduct.entity";

@Entity("products")
export class Product extends BaseEntity {
  @Column({ type: "varchar" })
  name: string;

  @ManyToOne(() => Brand, { nullable: false })
  @JoinColumn({ name: "brand_id" })
  brand: Brand;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: "category_id" })
  category: Category;

  @Column({ type: "varchar", nullable: true })
  description: string;

  @Column({ type: "varchar", nullable: true })
  detail: string;

  @Column({ type: "varchar", nullable: true, default: null })
  sku: string;

  @OneToMany(
    () => ProductClassification,
    (productClassification) => productClassification.product
  )
  @JoinColumn({ name: "product_classifications" })
  productClassifications: ProductClassification[];

  @OneToMany(() => ProductImage, (image) => image.product, { nullable: true })
  @JoinColumn({ name: "product_images" })
  images?: ProductImage[];

  @OneToMany(
    () => PreOrderProduct,
    (preOrderProduct) => preOrderProduct.product
  )
  @JoinColumn({ name: "pre_order_products" })
  preOrderProducts: PreOrderProduct[];

  @OneToMany(
    () => ProductDiscount,
    (productDiscount) => productDiscount.product
  )
  @JoinColumn({ name: "product_discounts" })
  productDiscounts: ProductDiscount[];

  @Column({
    type: "enum",
    enum: ProductEnum,
    default: ProductEnum.OFFICIAL,
  })
  status: ProductEnum;

  @ManyToMany(() => GroupProduct, (groupProduct) => groupProduct.products)
  groupProducts: GroupProduct[];
}
