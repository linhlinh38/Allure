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
import { Voucher } from "./voucher.entity";
import { Account } from "./account.entity";
import { StatusTracking } from "./statusTracking.entity";
import { ConsultantService } from "./consultantService.entity";
import { Slot } from "./slot.entity";
import { Report } from "./report.entity";

@Entity("bookings")
export class Booking extends BaseEntity {
  @Column({ type: "double precision", default: 0 })
  totalPrice: number;

  @Column({ type: "timestamp", name: "start_time" })
  startTime: Date;

  @Column({ type: "timestamp", name: "end_time" })
  endTime: Date;

  @Column({ type: "double precision", default: 0, name: "voucher_discount" })
  voucherDiscount: number = 0;

  @Column({
    type: "enum",
    enum: PaymentMethodEnum,
    default: PaymentMethodEnum.BANK_TRANSFER,
    nullable: true,
  })
  paymentMethod: PaymentMethodEnum;

  @Column({ type: "varchar", length: 255, nullable: true })
  notes: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "meet_url" })
  meetUrl: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  record: string;

  @Column({
    type: "enum",
    enum: BookingTypeEnum,
  })
  type: BookingTypeEnum;

  @Column({
    type: "enum",
    enum: BookingStatusEnum,
  })
  status: BookingStatusEnum;

  @ManyToOne(() => Voucher, (voucher) => voucher.orders, {
    nullable: true,
  })
  @JoinColumn({ name: "voucher_id" })
  voucher: Voucher;

  @ManyToOne(() => Slot, (slot) => slot.bookings, {
    nullable: true,
  })
  slot: Slot;

  @ManyToOne(() => Account, (account) => account.bookings)
  @JoinColumn({ name: "account_id" })
  account: Account;

  @ManyToOne(() => Account, { nullable: true })
  @JoinColumn({ name: "assignee_to_interview_id" })
  assigneeToInterview: Account;

  @Column({ type: "varchar", length: 255, nullable: true })
  resultNote: string;

  @ManyToOne(() => ConsultantService, (service) => service.bookings, {
    nullable: true,
  })
  consultantService: ConsultantService;

  @OneToMany(() => StatusTracking, (statusTracking) => statusTracking.booking)
  statusTrackings: StatusTracking[];

  @OneToOne(() => Report, (report) => report.booking)
  report: Report;
}
