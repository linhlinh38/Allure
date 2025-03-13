import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrderRequestTypeEnum, RequestStatusEnum } from '../utils/enum';
import { Order } from './order.entity';
import { File } from './file.entity';

@Entity('order_requests')
export class OrderRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @OneToMany(() => File, (mediaFile) => mediaFile.orderRequest, {
    cascade: true,
  })
  mediaFiles: File[];

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
    name: 'reason_rejected',
  })
  reasonRejected: string;

  @ManyToOne(() => Order, (order) => order.requests, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({
    type: 'enum',
    enum: OrderRequestTypeEnum,
  })
  type: OrderRequestTypeEnum;

  @OneToOne(() => OrderRequest, (orderRequest) => orderRequest.refundRequest, {
    nullable: true,
  })
  @JoinColumn({ name: 'rejected_refund_request_id' })
  rejectedRefundRequest: OrderRequest;

  @OneToOne(
    () => OrderRequest,
    (orderRequest) => orderRequest.rejectedRefundRequest,
    { nullable: true }
  )
  refundRequest: OrderRequest;

  @Column({
    type: 'enum',
    enum: RequestStatusEnum,
    default: RequestStatusEnum.PENDING,
  })
  status: RequestStatusEnum;
}
