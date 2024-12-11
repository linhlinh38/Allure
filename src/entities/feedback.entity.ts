import {
  Entity,
  Column,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { OrderDetail } from './orderDetail.entity';

@Entity('feedbacks')
export class Feedback extends BaseEntity {
  @Column({ type: 'integer', nullable: false })
  rating: string;

  @Column({ type: 'varchar' })
  feedback: string;

  @OneToOne(() => OrderDetail, (orderDetail) => orderDetail.feedback)
  orderDetail: OrderDetail;
}
