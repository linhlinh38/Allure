import { Entity, Column, OneToMany, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrderDetail } from './orderDetail.entity';
import { Reply } from './reply.entity';
import { MediaFile } from './mediaFile.entity';
import { Report } from './report.entity';
import { Booking } from './booking.entity';

@Entity('feedbacks')
export class Feedback extends BaseEntity {
  @Column({ type: 'integer' })
  rating: number;

  @Column({ type: 'varchar' })
  content: string;

  @OneToOne(() => OrderDetail, (orderDetail) => orderDetail.feedback, {
    nullable: true,
  })
  @JoinColumn({ name: 'order_detail_id' })
  orderDetail: OrderDetail;

  @OneToOne(() => Booking, (booking) => booking.feedback, {
    nullable: true,
  })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @OneToMany(() => MediaFile, (mediaFile) => mediaFile.feedback, {
    cascade: true,
  })
  mediaFiles: MediaFile[];

  @OneToMany(() => Reply, (reply) => reply.feedback)
  replies: Reply[];

  @OneToOne(() => Report, (report) => report.feedback)
  report: Report;
}
