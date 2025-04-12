import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { LiveStreamEnum } from "../utils/enum";
import { Account } from "./account.entity";
import { Order } from "./order.entity";
import { LivestreamProduct } from "./livestreamProduct.entity";
import { CartItem } from "./cartItem.entity";

@Entity("livestreams")
export class LiveStream extends BaseEntity {
  @Column({ type: "varchar", length: 100, nullable: true })
  title: string;

  @Column({ type: "timestamp with time zone", name: "start_time" })
  startTime: Date;

  @Column({
    type: "timestamp with time zone",
    name: "end_time",
    nullable: true,
  })
  endTime: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  record: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  thumbnail: string;

  @Column({
    type: "enum",
    enum: LiveStreamEnum,
    default: LiveStreamEnum.SCHEDULED,
  })
  status: LiveStreamEnum;

  @ManyToOne(() => Account)
  @JoinColumn({ name: "account_id" })
  account: Account;

  @OneToMany(() => Order, (order) => order.livestream)
  orders: Order[];

  @OneToMany(
    () => LivestreamProduct,
    (livestreamProduct) => livestreamProduct.livestream,
    {
      cascade: true,
    }
  )
  livestreamProducts: LivestreamProduct[];

  @OneToMany(() => CartItem, (cart) => cart.livestream)
  cartItems: CartItem[];
}
