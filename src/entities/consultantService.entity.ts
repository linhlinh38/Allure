import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { Account } from "./account.entity";
import { SystemService } from "./systemService.entity";
import { ServiceBookingForm } from "./serviceBookingForm.entity";
import { ServiceImage } from "./serviceImage.entity";
import { Booking } from "./booking.entity";

@Entity("consultant_services")
export class ConsultantService extends BaseEntity {
  @Column({ type: "int", nullable: false })
  price: number;

  // @Column({ type: "int", nullable: false, name: "daily_slot" })
  // dailySlot: number;

  @Column({ type: "varchar", nullable: true })
  detail: string;

  @ManyToOne(() => Account, (account) => account.consultantServices)
  @JoinColumn({ name: "account_id" })
  account: Account;

  @ManyToOne(() => SystemService, (service) => service.consultantServices)
  @JoinColumn({ name: "system_service_id" })
  systemService: SystemService;

  @ManyToOne(() => ServiceBookingForm, (form) => form.consultantServices)
  @JoinColumn({ name: "service_booking_form_id" })
  serviceBookingForm: ServiceBookingForm;

  @OneToMany(() => ServiceImage, (image) => image.consultantService)
  images?: ServiceImage[];

  @OneToMany(() => Booking, (booking) => booking.consultantService)
  bookings?: Booking[];

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
