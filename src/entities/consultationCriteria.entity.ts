import { Entity, Column, OneToMany } from "typeorm";
import { StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { SystemService } from "./systemService.entity";
import { ConsultationCriteriaSection } from "./consultationCriteriaSection.entity";

@Entity("consultation_criteria")
export class ConsultationCriteria extends BaseEntity {
  @Column({ type: "varchar" })
  title: string;

  @OneToMany(() => SystemService, (service) => service.consultationCriteria)
  systemServices?: SystemService[];

  @OneToMany(
    () => ConsultationCriteriaSection,
    (section) => section.consultationCriteria
  )
  consultationCriteriaSections?: ConsultationCriteriaSection[];

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
