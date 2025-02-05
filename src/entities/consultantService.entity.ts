import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Product } from "./product.entity";
import { ServiceTypeEnum, StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { PreOrderProduct } from "./preOrderProduct.entity";
import { CartItem } from "./cartItem.entity";
import { Category } from "./category.entity";
import { Account } from "./account.entity";
import { SystemService } from "./systemService.entity";
import { ServiceBookingForm } from "./serviceBookingForm.entity";

@Entity("consultant_services")
export class ConsultantService extends BaseEntity {
  @Column({ type: "int", nullable: false })
  price: number;

  @ManyToOne(() => Account, (account) => account.consultantServices)
  @JoinColumn({ name: "account_id" })
  account: Account;

  @ManyToOne(() => SystemService, (service) => service.consultantServices)
  @JoinColumn({ name: "system_service_id" })
  systemService: SystemService;

  @ManyToOne(() => ServiceBookingForm, (form) => form.consultantServices)
  @JoinColumn({ name: "service_booking_form_id" })
  serviceBookingForm: ServiceBookingForm;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
