import { Column, Entity, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Account } from "./account.entity";
import { PaymentMethodEnum, TransactionTypeEnum } from "../utils/enum";
import { Order } from "./order.entity";
import { Brand } from "./brand.entity";
import { Booking } from "./booking.entity";

@Entity("transactions")
export class Transaction extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.transactions, {
    nullable: true,
    onDelete: "SET NULL",
  })
  order: Order;

  @ManyToOne(() => Booking, (booking) => booking.transactions, {
    nullable: true,
    onDelete: "SET NULL",
  })
  booking: Booking;

  @ManyToOne(() => Account, (buyer) => buyer.transactions)
  buyer: Account;

  @ManyToOne(() => Brand, (brand) => brand.transactions, { nullable: true })
  brand: Brand;

  @ManyToOne(() => Account, (consultant) => consultant.transactions, {
    nullable: true,
  })
  consultant: Account;

  @Column({ type: "double precision" })
  amount: number;

  @Column({
    type: "double precision",
    default: 0,
    name: "balance_after_transaction",
  })
  balanceAfterTransaction: number;

  @Column({
    type: "enum",
    enum: PaymentMethodEnum,
    name: "payment_method",
  })
  paymentMethod: PaymentMethodEnum;

  @Column({
    type: "enum",
    enum: TransactionTypeEnum,
    default: TransactionTypeEnum.ORDER_PURCHASE,
  })
  type: TransactionTypeEnum;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any>;
}
