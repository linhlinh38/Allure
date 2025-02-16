import { Entity, Column, OneToMany } from "typeorm";
import { StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { BannerConfig } from "./bannerConfig.entity";

@Entity('master_configs')
export class MasterConfig extends BaseEntity {
  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' })
  logo: string;

  @Column({ name: 'max_level_category', type: 'int', default: 4 })
  maxLevelCategory: number;

  @OneToMany(() => BannerConfig, (banner) => banner.masterConfig, {
    nullable: true,
  })
  banners?: BannerConfig[];

  @Column({
    name: 'group_buying_remaining_time',
    type: 'int',
    default: 5 * 60 * 1000,
  })
  groupBuyingRemainingTime: number;

  @Column({
    name: 'waiting_pending_order_time',
    type: 'int',
    default: 24 * 60 * 60 * 1000,
  })
  waitingPendingOrderTime: number;

  @Column({
    name: 'waiting_completed_order_time',
    type: 'int',
    default: 24 * 60 * 60 * 1000,
  })
  waitingCompletedOrderTime: number;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
