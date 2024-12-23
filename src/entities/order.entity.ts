import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrderEnum, ShippingStatusEnum, StatusEnum } from '../utils/enum';
import { GroupBuying } from './groupBuying.entity';
import { LiveStream } from './livestream.entity';
import { Voucher } from './voucher.entity';
import { Account } from './account.entity';
import { OrderDetail } from './orderDetail.entity';

@Entity('orders')
export class Order extends BaseEntity {
  @Column({ type: 'double precision' })
  subTotal: number;

  @Column({ type: 'double precision' })
  totalPrice: number;

  @Column({ type: 'double precision', default: 0 })
  platformVoucherDiscount: number = 0;

  @Column({ type: 'double precision', default: 0 })
  shopVoucherDiscount: number = 0;

  @Column({ type: 'varchar', length: 255 })
  shippingAddress: string;

  @Column({ type: 'varchar', length: 15, nullable: false })
  phone: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  paymentMethod: string;

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
    default: ShippingStatusEnum.TO_SHIP,
  })
  status: ShippingStatusEnum;

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
  parent: Order;

  @OneToMany(() => Order, (order) => order.parent, {
    cascade: true,
  })
  children: Order[];

  @OneToMany(() => OrderDetail, (orderDetail) => orderDetail.order, {
    cascade: true,
  })
  orderDetails: OrderDetail[];
}
