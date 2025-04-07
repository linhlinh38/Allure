import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { StatusEnum } from "../utils/enum";
import { Account } from "./account.entity";
import { ProductClassification } from "./productClassification.entity";
import { GroupBuying } from "./groupBuying.entity";

@Entity("cart_items")
export class CartItem extends BaseEntity {
  @Column({ type: "int", nullable: false })
  quantity: number;

  @Column({ type: "double precision", default: 0, name: "livestream_discount" })
  livestreamDiscount: number;

  @Column({ type: "varchar", length: 100, nullable: false })
  classification: string;

  @ManyToOne(() => GroupBuying, { nullable: true })
  @JoinColumn({ name: "group_buying_id" })
  groupBuying: string;

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
