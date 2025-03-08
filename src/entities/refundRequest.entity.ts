import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { MediaFile } from './mediaFile.entity';
import { Order } from './order.entity';
import { RequestStatusEnum } from '../utils/enum';
import { RejectRefundRequest } from './rejectRefundRequest.entity';

@Entity('refund_requests')
export class RefundRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @OneToOne(() => Order, (order) => order.refundRequest)
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @OneToMany(() => MediaFile, (mediaFile) => mediaFile.refundRequest, {
    cascade: true,
  })
  mediaFiles: MediaFile[];

  // @Column({
  //   type: 'varchar',
  //   length: 255,
  //   nullable: true,
  //   name: 'reason_rejected',
  // })
  // reasonRejected: string;

  @OneToOne(
    () => RejectRefundRequest,
    (rejectRefundRequest) => rejectRefundRequest.refundRequest
  )
  rejectRefundRequest: RejectRefundRequest;

  @Column({
    type: 'enum',
    enum: RequestStatusEnum,
    default: RequestStatusEnum.PENDING,
  })
  status: RequestStatusEnum;
}
