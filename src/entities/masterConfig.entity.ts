import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { Product } from "./product.entity";
import { ServiceTypeEnum, StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { PreOrderProduct } from "./preOrderProduct.entity";
import { CartItem } from "./cartItem.entity";
import { Category } from "./category.entity";
import { BannerConfig } from "./bannerConfig.entity";

@Entity("master_configs")
export class MasterConfig extends BaseEntity {
  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar" })
  logo: string;

  @Column({ name: "max_level_category", type: "int", default: 4 })
  maxLevelCategory: number;

  @OneToMany(() => BannerConfig, (banner) => banner.masterConfig, {
    nullable: true,
  })
  banners?: BannerConfig[];

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
