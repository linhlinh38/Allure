import { Entity, Column, OneToMany, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrderDetail } from './orderDetail.entity';
import { FeedbackMediaFile } from './feedbackMediafile.entity';
import { Reply } from './reply.entity';

@Entity('feedbacks')
export class Feedback extends BaseEntity {
  @Column({ type: 'integer' })
  rating: number;

  @Column({ type: 'varchar' })
  content: string;

  @OneToOne(() => OrderDetail, (orderDetail) => orderDetail.feedback)
  orderDetail: OrderDetail;

  @OneToMany(
    () => FeedbackMediaFile,
    (feedbackMediaFile) => feedbackMediaFile.feedback,
    { cascade: true }
  )
  mediaFiles: FeedbackMediaFile[];

  @OneToMany(() => Reply, (reply) => reply.feedback)
  replies: Reply[];
}
