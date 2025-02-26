import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { ConsultationCriteria } from "./consultationCriteria.entity";

@Entity("consultation_criteria_sections")
export class ConsultationCriteriaSection extends BaseEntity {
  @Column({ type: "varchar" })
  section: string;

  @Column({ type: "varchar" })
  description: string;

  @Column({ type: "boolean", default: false })
  mandatory: boolean;

  @Column({ type: "int", name: "order_index" })
  orderIndex: number;

  @ManyToOne(
    () => ConsultationCriteria,
    (sheet) => sheet.consultationCriteriaSections
  )
  @JoinColumn({ name: "consultation_criteria_id" })
  consultationCriteria: ConsultationCriteria;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
