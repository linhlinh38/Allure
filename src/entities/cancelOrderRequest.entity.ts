import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { RequestStatusEnum } from '../utils/enum';
import { Order } from './order.entity';

@Entity('cancel_order_requests')
export class CancelOrderRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @OneToOne(() => Order, (order) => order.cancelOrderRequest)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: RequestStatusEnum,
    default: RequestStatusEnum.PENDING,
  })
  status: RequestStatusEnum;
}
