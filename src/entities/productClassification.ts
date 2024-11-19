import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Product } from "./product.entity";
import { StatusEnum } from "../utils/enum";

@Entity("product_classifications")
export class ProductClassification {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  title: string;

  @Column({ type: "int" })
  quantity: number;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: "productId" })
  product: Product;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
