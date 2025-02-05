import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Product } from "./product.entity";
import { QuestionTypeEnum, ServiceTypeEnum, StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { PreOrderProduct } from "./preOrderProduct.entity";
import { CartItem } from "./cartItem.entity";
import { Category } from "./category.entity";
import { ConsultantService } from "./consultantService.entity";
import { ServiceBookingForm } from "./serviceBookingForm.entity";

@Entity("questions")
export class Question extends BaseEntity {
  @Column({ type: "varchar" })
  question: string;

  @Column({ type: "int", name: "order_index" })
  orderIndex: number;

  @Column({ type: "varchar", nullable: true })
  image: string;

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
