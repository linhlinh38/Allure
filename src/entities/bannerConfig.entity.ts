import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { StatusEnum } from "../utils/enum";
import { Product } from "./product.entity";
import { ProductClassification } from "./productClassification.entity";
import { MasterConfig } from "./masterConfig.entity";

@Entity("banner_configs")
export class BannerConfig extends BaseEntity {
  @Column({ type: "varchar", length: 100, nullable: true })
  name?: string;

  @Column({ name: "file_url", type: "varchar", length: 100, nullable: false })
  fileUrl: string;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @ManyToOne(() => MasterConfig, (masterConfig) => masterConfig.banners)
  @JoinColumn({ name: "master_config_id" })
  masterConfig: MasterConfig;
}
