import { Entity, Column, ManyToOne, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { ServiceBookingForm } from "./serviceBookingForm.entity";
import { Booking } from "./booking.entity";

@Entity("booking_form_answers")
export class BookingFormAnswer extends BaseEntity {
  @ManyToOne(() => ServiceBookingForm, (form) => form.bookingFormAnswers, {
    nullable: false,
  })
  @JoinColumn({ name: "service_booking_form_id" })
  serviceBookingForm: ServiceBookingForm;

  @OneToOne(() => Booking, (booking) => booking.bookingFormAnswer)
  @JoinColumn({ name: "booking_id" })
  booking: Booking;

  @Column({ type: "jsonb", nullable: false })
  form: object[];

  @Column({ type: "jsonb", nullable: false })
  answers: object[];
}
