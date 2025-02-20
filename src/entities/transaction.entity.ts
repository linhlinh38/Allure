import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Account } from './account.entity';
import {
  PaymentMethodEnum,
  TransactionStatusEnum as TransactionStatusEnum,
  TransactionTypeEnum as TransactionTypeEnum,
} from '../utils/enum';
import { Order } from './order.entity';
import { Brand } from './brand.entity';

@Entity('transactions')
export class Transaction extends BaseEntity {
  @ManyToOne(() => Order, (order) => order.transaction, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  order: Order;

  @ManyToOne(() => Account, (buyer) => buyer.transactions)
  buyer: Account;

  @ManyToOne(() => Brand, (brand) => brand.transactions, { nullable: true })
  brand: Brand;

  @Column({ type: 'double precision' })
  amount: number;

  @Column({
    type: 'enum',
    enum: PaymentMethodEnum,
  })
  paymentMethod: PaymentMethodEnum;

  @Column({ type: 'enum', enum: TransactionTypeEnum })
  type: TransactionTypeEnum;

  @Column({
    type: 'enum',
    enum: TransactionStatusEnum,
  })
  status: TransactionStatusEnum;
}
