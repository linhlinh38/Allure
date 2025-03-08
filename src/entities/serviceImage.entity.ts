import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { StatusEnum } from "../utils/enum";
import { Product } from "./product.entity";
import { ProductClassification } from "./productClassification.entity";
import { Question } from "./question.entity";
import { ConsultantService } from "./consultantService.entity";
import { SystemService } from "./systemService.entity";

@Entity("service_images")
export class ServiceImage extends BaseEntity {
  @Column({ type: "varchar", length: 100, nullable: true })
  name?: string;

  @Column({ name: "file_url", type: "varchar", nullable: false })
  fileUrl: string;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @ManyToOne(() => SystemService, (systemService) => systemService.images, {
    nullable: true,
  })
  @JoinColumn({ name: "system_service_id" })
  systemService: SystemService;

  @ManyToOne(
    () => ConsultantService,
    (consultantService) => consultantService.images,
    {
      nullable: true,
    }
  )
  @JoinColumn({ name: "consultant_service_id" })
  consultantService: ConsultantService;

  @ManyToOne(() => Question, (question) => question.images, { nullable: true })
  @JoinColumn({ name: "question_id" })
  question: Question;
}
