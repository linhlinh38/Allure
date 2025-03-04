import { Entity, Column, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrderDetail } from './orderDetail.entity';
import { Reply } from './reply.entity';
import { MediaFile } from './mediaFile.entity';

@Entity('feedbacks')
export class Feedback extends BaseEntity {
  @Column({ type: 'integer' })
  rating: number;

  @Column({ type: 'varchar' })
  content: string;

  @OneToOne(() => OrderDetail, (orderDetail) => orderDetail.feedback)
  orderDetail: OrderDetail;

  @OneToMany(
    () => MediaFile,
    (mediaFile) => mediaFile.feedback,
    { cascade: true }
  )
  mediaFiles: MediaFile[];

  @OneToMany(() => Reply, (reply) => reply.feedback)
  replies: Reply[];
}
