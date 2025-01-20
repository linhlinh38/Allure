import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { LiveStream } from './livestream.entity';
import { ProductClassification } from './productClassification.entity';
import { ProductDiscount } from './productDiscount.entity';
import { Order } from './order.entity';
import { Feedback } from './feedback.entity';
import { OrderEnum } from '../utils/enum';

@Entity('order_details')
export class OrderDetail extends BaseEntity {
  @Column({ type: 'double precision', nullable: true })
  unitPriceBeforeDiscount: number;

  @Column({ type: 'double precision', nullable: true })
  unitPriceAfterDiscount: number;

  @Column({ type: 'double precision' })
  subTotal: number;

  @Column({ type: 'double precision' })
  totalPrice: number;

  @Column({ type: 'double precision', default: 0 })
  platformVoucherDiscount: number = 0;

  @Column({ type: 'double precision', default: 0 })
  shopVoucherDiscount: number = 0;

  @Column({ type: 'integer', nullable: false })
  quantity: number;

  @Column({ type: 'varchar', nullable: true })
  productName: string;

  @Column({ type: 'varchar', nullable: true })
  classificationName: string;

  @Column({
    type: 'enum',
    enum: OrderEnum,
    default: OrderEnum.NORMAL,
  })
  type: OrderEnum;

  @Column({ type: 'boolean', default: false })
  isFeedback: boolean;

  @ManyToOne(() => ProductDiscount, {
    nullable: true,
  })
  @JoinColumn({ name: 'product_discount_id' })
  productDiscount: ProductDiscount;

  @ManyToOne(() => ProductClassification, {
    nullable: true,
  })
  @JoinColumn({ name: 'product_classification_id' })
  productClassification: ProductClassification;

  // @ManyToOne(() => ProductClassification, {
  //   nullable: true,
  // })
  // @JoinColumn({ name: 'product_classification_pre_order_id' })
  // productClassificationPreOrder: ProductClassification;

  @ManyToOne(() => LiveStream, (livestream) => livestream.orders, {
    nullable: true,
  })
  @JoinColumn({ name: 'livestream_id' })
  livestream: LiveStream;

  @ManyToOne(() => Order, (order) => order.orderDetails, {
    nullable: false,
  })
  order: Order;

  @OneToOne(() => Feedback, (feedback) => feedback.orderDetail, {
    nullable: true,
  })
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;
}
