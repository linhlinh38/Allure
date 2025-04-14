import { Transaction } from "./transaction.entity";
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import {
  OrderEnum,
  PaymentMethodEnum,
  ShippingStatusEnum,
} from "../utils/enum";
import { GroupBuying } from "./groupBuying.entity";
import { LiveStream } from "./livestream.entity";
import { Voucher } from "./voucher.entity";
import { Account } from "./account.entity";
import { OrderDetail } from "./orderDetail.entity";
import { StatusTracking } from "./statusTracking.entity";
import { Brand } from "./brand.entity";
import { Report } from "./report.entity";
import { OrderRequest } from "./orderRequest.entity";

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ type: 'double precision', name: 'sub_total' })
  subTotal: number;

  @Column({ type: 'double precision', name: 'total_price' })
  totalPrice: number;

  @Column({
    type: 'double precision',
    default: 0,
    name: 'total_platform_voucher_discount',
  })
  platformVoucherDiscount: number = 0;

  @Column({
    type: 'double precision',
    default: 0,
    name: 'total_shop_voucher_discount',
  })
  shopVoucherDiscount: number = 0;

  @Column({ type: 'varchar', length: 255, name: 'shipping_address' })
  shippingAddress: string;

  @Column({ type: 'varchar', length: 15, nullable: false })
  phone: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
    name: 'recipient_name',
  })
  recipientName: string;

  @Column({
    type: 'enum',
    enum: PaymentMethodEnum,
    default: PaymentMethodEnum.BANK_TRANSFER,
    name: 'payment_method',
  })
  paymentMethod: PaymentMethodEnum;

  @Column({
    name: 'is_payment_method_updated',
    default: false,
    type: 'boolean',
  })
  isPaymentMethodUpdated: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  message: string;

  @Column({
    type: 'enum',
    enum: OrderEnum,
    default: OrderEnum.NORMAL,
  })
  type: OrderEnum;

  @Column({
    type: 'enum',
    enum: ShippingStatusEnum,
    default: ShippingStatusEnum.WAIT_FOR_CONFIRMATION,
  })
  status: ShippingStatusEnum;

  @Column({
    name: 'is_paid_for_brand',
    default: false,
    type: 'boolean',
  })
  isPaidForBrand: boolean;

  @ManyToOne(() => GroupBuying, (groupBuying) => groupBuying.orders, {
    nullable: true,
  })
  @JoinColumn({ name: 'group_buying_id' })
  groupBuying: GroupBuying;

  @ManyToOne(() => LiveStream, (livestream) => livestream.orders, {
    nullable: true,
  })
  @JoinColumn({ name: 'livestream_id' })
  livestream: LiveStream;

  @ManyToOne(() => Voucher, (voucher) => voucher.orders, {
    nullable: true,
  })
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;

  @ManyToOne(() => Account, (account) => account.orders)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Order, (order) => order.children, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Order;

  @ManyToOne(() => Brand, (brand) => brand.orders, { nullable: true })
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @OneToMany(() => Order, (order) => order.parent, {
    cascade: true,
  })
  children: Order[];

  @OneToMany(() => OrderDetail, (orderDetail) => orderDetail.order, {
    cascade: true,
  })
  @JoinColumn({ name: 'order_detail_id' })
  orderDetails: OrderDetail[];

  @OneToMany(() => StatusTracking, (statusTracking) => statusTracking.order)
  @JoinColumn({ name: 'status_tracking_id' })
  statusTrackings: StatusTracking[];

  @Column({
    type: 'timestamp with time zone',
    name: 'expired_received_time',
    nullable: true,
  })
  expiredReceivedTime: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.order)
  transactions: Transaction[];

  @OneToOne(() => Report, (report) => report.order)
  report: Report;

  @OneToMany(() => OrderRequest, (orderRequest) => orderRequest.order, {
    cascade: true,
  })
  requests: OrderRequest[];
}
