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
import { ResultSheet } from "./resultSheet.entity";

@Entity("result_sheet_section")
export class ResultSheetSection extends BaseEntity {
  @Column({ type: "varchar" })
  section: string;

  @Column({ type: "varchar" })
  description: string;

  @Column({ type: "boolean", default: false })
  mandatory: boolean;

  @Column({ type: "int", name: "order_index" })
  orderIndex: number;

  @ManyToOne(() => ResultSheet, (sheet) => sheet.resultSheetSections)
  resultSheet: ResultSheet;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
