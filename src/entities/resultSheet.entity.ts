import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Product } from "./product.entity";
import { QuestionTypeEnum, ServiceTypeEnum, StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { PreOrderProduct } from "./preOrderProduct.entity";
import { CartItem } from "./cartItem.entity";
import { Category } from "./category.entity";
import { ConsultantService } from "./consultantService.entity";
import { ServiceBookingForm } from "./serviceBookingForm.entity";
import { SystemService } from "./systemService.entity";

@Entity("result_sheets")
export class ResultSheet extends BaseEntity {
  @Column({ type: "varchar" })
  title: string;

  @OneToMany(() => SystemService, (service) => service.resultSheet)
  systemServices?: SystemService[];

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
