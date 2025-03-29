import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import {
  BookingStatusEnum,
  BookingTypeEnum,
  PaymentMethodEnum,
} from "../utils/enum";
import { Account } from "./account.entity";
import { StatusTracking } from "./statusTracking.entity";
import { ConsultantService } from "./consultantService.entity";
import { Slot } from "./slot.entity";
import { Report } from "./report.entity";
import { Brand } from "./brand.entity";
import { Transaction } from "./transaction.entity";
import { Feedback } from "./feedback.entity";

@Entity('bookings')
export class Booking extends BaseEntity {
  @Column({ type: 'double precision', default: 0 })
  totalPrice: number;

  @Column({ type: 'timestamp with time zone', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'timestamp with time zone', name: 'end_time' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: PaymentMethodEnum,
    default: PaymentMethodEnum.BANK_TRANSFER,
    nullable: true,
  })
  paymentMethod: PaymentMethodEnum;

  @Column({ type: 'varchar', length: 255, nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'meet_url' })
  meetUrl: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  record: string;

  @Column({
    type: 'enum',
    enum: BookingTypeEnum,
  })
  type: BookingTypeEnum;

  @Column({
    type: 'enum',
    enum: BookingStatusEnum,
  })
  status: BookingStatusEnum;

  @ManyToOne(() => Slot, (slot) => slot.bookings, {
    nullable: true,
  })
  @JoinColumn({ name: 'slot_id' })
  slot: Slot;

  @ManyToOne(() => Account, (account) => account.bookings)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Brand, (brand) => brand.bookings)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  // @ManyToOne(() => Account, { nullable: true })
  // @JoinColumn({ name: 'assignee_to_interview_id' })
  // assigneeToInterview: Account;

  @Column({ type: 'varchar', length: 255, nullable: true })
  resultNote: string;

  @ManyToOne(() => ConsultantService, (service) => service.bookings, {
    nullable: true,
  })
  @JoinColumn({ name: 'consultant_service_id' })
  consultantService: ConsultantService;

  @OneToMany(() => StatusTracking, (statusTracking) => statusTracking.booking)
  statusTrackings: StatusTracking[];

  @OneToMany(() => Transaction, (transaction) => transaction.booking)
  transaction: Transaction[];

  @OneToOne(() => Report, (report) => report.booking)
  report: Report;

  @OneToMany(() => Transaction, (transaction) => transaction.booking)
  transactions: Transaction[];

  @OneToOne(() => Feedback, (feedback) => feedback.booking, {
    nullable: true,
  })
  feedback: Feedback;
}
