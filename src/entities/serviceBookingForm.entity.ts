import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import {
  AddressEnum,
  FileEnum,
  GenderEnum,
  RoleEnum,
  StatusEnum,
} from "../utils/enum";
import { Account } from "./account.entity";
import { ConsultantService } from "./consultantService.entity";
import { Question } from "./question.entity";

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

  @OneToMany(() => Question, (question) => question.serviceBookingForm, {
    nullable: true,
  })
  questions?: Question[];
}
