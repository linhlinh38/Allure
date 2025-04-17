import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { ProductClassification } from "./productClassification.entity";
import { ProductDiscount } from "./productDiscount.entity";
import { Order } from "./order.entity";
import { Feedback } from "./feedback.entity";
import { OrderEnum } from "../utils/enum";
import { LiveStream } from "./livestream.entity";

@Entity("order_details")
export class OrderDetail extends BaseEntity {
  @Column({
    type: "double precision",
    nullable: true,
    name: "unit_price_before_discount",
  })
  unitPriceBeforeDiscount: number;

  @Column({
    type: "double precision",
    nullable: true,
    name: "unit_price_after_discount",
  })
  unitPriceAfterDiscount: number;

  @Column({ type: "double precision", name: "sub_total" })
  subTotal: number;

  @Column({ type: "double precision", name: "total_price" })
  totalPrice: number;

  @Column({
    type: "double precision",
    default: 0,
    name: "platform_voucher_discount",
  })
  platformVoucherDiscount: number = 0;

  @Column({
    type: "double precision",
    default: 0,
    name: "shop_voucher_discount",
  })
  shopVoucherDiscount: number = 0;

  @Column({ type: "integer", nullable: false })
  quantity: number;

  @Column({ type: "varchar", nullable: true, name: "product_name" })
  productName: string;

  @Column({ type: "varchar", nullable: true, name: "classification_name" })
  classificationName: string;

  @Column({
    type: "enum",
    enum: OrderEnum,
    default: OrderEnum.NORMAL,
  })
  type: OrderEnum;

  @ManyToOne(() => ProductDiscount, {
    nullable: true,
  })
  @JoinColumn({ name: "product_discount_id" })
  productDiscount: ProductDiscount;

  @ManyToOne(() => ProductClassification, {
    nullable: true,
  })
  @JoinColumn({ name: "product_classification_id" })
  productClassification: ProductClassification;

  @ManyToOne(() => LiveStream, (livestream) => livestream.orderDetails, {
      nullable: true,
    })
    @JoinColumn({ name: 'livestream_id' })
    livestream: LiveStream;

  // @ManyToOne(() => ProductClassification, {
  //   nullable: true,
  // })
  // @JoinColumn({ name: 'product_classification_pre_order_id' })
  // productClassificationPreOrder: ProductClassification;

  // @ManyToOne(() => LiveStream, (livestream) => livestream.orders, {
  //   nullable: true,
  // })
  // @JoinColumn({ name: 'livestream_id' })
  // livestream: LiveStream;

  @ManyToOne(() => Order, (order) => order.orderDetails, {
    nullable: true,
  })
  @JoinColumn({ name: "order_id" })
  order: Order;

  @OneToOne(() => Feedback, (feedback) => feedback.orderDetail, {
    nullable: true,
  })
  feedback: Feedback;
}
