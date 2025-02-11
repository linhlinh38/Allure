import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Product } from "./product.entity";
import { ServiceTypeEnum, StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { PreOrderProduct } from "./preOrderProduct.entity";
import { CartItem } from "./cartItem.entity";
import { Category } from "./category.entity";
import { ConsultantService } from "./consultantService.entity";
import { ResultSheet } from "./resultSheet.entity";
import { ServiceImage } from "./serviceImage.entity";

@Entity("system_services")
export class SystemService extends BaseEntity {
  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  description: string;

  @ManyToOne(() => Category, { nullable: true })
  @JoinColumn({ name: "category_id" })
  category: Category;

  @Column({
    type: "enum",
    enum: ServiceTypeEnum,
  })
  type: ServiceTypeEnum;

  @OneToMany(() => ConsultantService, (service) => service.systemService)
  consultantServices?: ConsultantService[];

  @ManyToOne(() => ResultSheet, (result) => result.systemServices)
  @JoinColumn({ name: "result_sheet_id" })
  resultSheet: ResultSheet;

  @OneToMany(() => ServiceImage, (image) => image.systemService, {
    nullable: true,
  })
  images?: ServiceImage[];

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
