import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { RequestStatusEnum } from '../utils/enum';
import { RefundRequest } from './refundRequest.entity';
import { MediaFile } from './mediaFile.entity';

@Entity('reject_refund_requests')
export class RejectRefundRequest extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @OneToMany(() => MediaFile, (mediaFile) => mediaFile.rejectRefundRequest, {
    cascade: true,
  })
  mediaFiles: MediaFile[];

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
