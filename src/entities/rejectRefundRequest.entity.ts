import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { RequestStatusEnum } from '../utils/enum';
import { RefundRequest } from './refundRequest.entity';

@Entity('reject_refund_requests')
export class RejectRefundRequest extends BaseEntity {
  @Column({
    type: 'enum',
    enum: RequestStatusEnum,
    default: RequestStatusEnum.PENDING,
  })
  status: RequestStatusEnum;

  @OneToOne(
    () => RefundRequest,
    (refundRequest) => refundRequest.rejectRefundRequest
  )
  @JoinColumn({ name: 'refund_request_id' })
  refundRequest: RefundRequest;
}
