import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ReportStatusEnum, ReportTypeEnum } from '../utils/enum';
import { Account } from './account.entity';
import { Order } from './order.entity';
import { Booking } from './booking.entity';
import { File } from './file.entity';
import { Feedback } from './feedback.entity';

@Entity('reports')
export class Report extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ReportTypeEnum,
  })
  type: ReportTypeEnum;

  @Column({ type: 'varchar' })
  reason: string;

  @OneToOne(() => File, (file) => file.report, { nullable: true })
  files: File[];

  @ManyToOne(() => Account, (assignee) => assignee.assignedReports, {
    nullable: true,
  })
  @JoinColumn({ name: 'assignee_id' })
  assignee: Account;

  @ManyToOne(() => Account, (reporter) => reporter.reportedReports)
  @JoinColumn({ name: 'reporter_id' })
  reporter: Account;

  @Column({ type: 'varchar', name: 'result_note', nullable: true })
  resultNote: string;

  @Column({
    type: 'enum',
    enum: ReportStatusEnum,
    default: ReportStatusEnum.PENDING,
  })
  status: ReportStatusEnum;

  @OneToOne(() => Order, (order) => order.report, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @OneToOne(() => Booking, (booking) => booking.report, { nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @OneToOne(() => Feedback, (feedback) => feedback.report, { nullable: true })
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;
}
