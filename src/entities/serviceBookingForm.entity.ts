import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { StatusEnum } from "../utils/enum";
import { ConsultantService } from "./consultantService.entity";
import { Question } from "./question.entity";
import { BookingFormAnswer } from "./bookingFormAnswer.entity";

@Entity("service_booking_forms")
export class ServiceBookingForm extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  title: string;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @OneToMany(() => ConsultantService, (service) => service.serviceBookingForm, {
    nullable: true,
  })
  consultantServices?: ConsultantService[];

  @OneToMany(() => BookingFormAnswer, (answer) => answer.serviceBookingForm, {
    nullable: true,
  })
  bookingFormAnswers?: BookingFormAnswer[];

  @OneToMany(() => Question, (question) => question.serviceBookingForm, {
    nullable: true,
  })
  questions?: Question[];
}
