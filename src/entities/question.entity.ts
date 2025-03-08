import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { QuestionTypeEnum, StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { ServiceBookingForm } from "./serviceBookingForm.entity";
import { ServiceImage } from "./serviceImage.entity";

@Entity("questions")
export class Question extends BaseEntity {
  @Column({ type: "varchar" })
  question: string;

  @Column({ type: "int", name: "order_index" })
  orderIndex: number;

  @Column({ type: "boolean", default: false })
  mandatory: boolean;

  @OneToMany(() => ServiceImage, (image) => image.question, {
    nullable: true,
  })
  images?: ServiceImage[];

  @Column({ type: "jsonb", nullable: true })
  answers: object;

  @Column({
    type: "enum",
    enum: QuestionTypeEnum,
  })
  type: QuestionTypeEnum;

  @ManyToOne(() => ServiceBookingForm, (form) => form.questions)
  @JoinColumn({ name: "service_booking_form_id" })
  serviceBookingForm: ServiceBookingForm;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
