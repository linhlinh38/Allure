import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Product } from "./product.entity";
import { ServiceTypeEnum, StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { PreOrderProduct } from "./preOrderProduct.entity";
import { CartItem } from "./cartItem.entity";
import { Category } from "./category.entity";

@Entity("services")
export class Service extends BaseEntity {
  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  description: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  image: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: "category_id" })
  category: Category;

  @Column({
    type: "enum",
    enum: ServiceTypeEnum,
  })
  type: ServiceTypeEnum;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
