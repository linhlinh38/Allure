import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { StatusEnum } from "../utils/enum";
import { Product } from "./product.entity";
import { ProductClassification } from "./productClassification.entity";

@Entity("product_images")
export class ProductImage extends BaseEntity {
  @Column({ type: "varchar", length: 100, nullable: true })
  name?: string;

  @Column({ name: "file_url", type: "varchar", length: 100, nullable: false })
  fileUrl: string;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @ManyToOne(() => Product, (product) => product.images)
  @JoinColumn({ name: "product_id" })
  product: Product;

  @ManyToOne(
    () => ProductClassification,
    (classification) => classification.images
  )
  @JoinColumn({ name: "product_classification_id" })
  productClassification: ProductClassification;
}
