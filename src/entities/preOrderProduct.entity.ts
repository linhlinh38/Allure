import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { Product } from "./product.entity";
import { PreOrderProductEnum, StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { ProductClassification } from "./productClassification.entity";

@Entity("pre_order_products")
export class PreOrderProduct extends BaseEntity {
  @Column({ type: "varchar" })
  startTime: string;

  @Column({ type: "varchar" })
  endTime: string;

  @OneToMany(
    () => ProductClassification,
    (productClassification) => productClassification.preOrderProduct
  )
  @JoinColumn({ name: "product_classifications" })
  productClassifications: ProductClassification[];

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({
    type: "enum",
    enum: PreOrderProductEnum,
    default: PreOrderProductEnum.WAITING,
  })
  status: PreOrderProductEnum;
}
