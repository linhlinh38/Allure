import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import {
  AddressEnum,
  FileEnum,
  GenderEnum,
  RoleEnum,
  StatusEnum,
} from "../utils/enum";
import { Account } from "./account.entity";
import { ProductClassification } from "./productClassification.entity";

@Entity("cart_items")
export class CartItem extends BaseEntity {
  @Column({ type: "int", nullable: false })
  quantity: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  classification: string;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @ManyToOne(
    () => ProductClassification,
    (classification) => classification.cartItems
  )
  @JoinColumn({ name: "product_classification_id" })
  productClassification: ProductClassification;

  @ManyToOne(() => Account, (account) => account.cartItems)
  @JoinColumn({ name: "account_id" })
  account: Account;
}
