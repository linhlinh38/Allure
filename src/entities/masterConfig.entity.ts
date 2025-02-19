import { Entity, Column, OneToMany } from "typeorm";
import { StatusEnum } from "../utils/enum";
import { BaseEntity } from "./base.entity";
import { BannerConfig } from "./bannerConfig.entity";
import { oneDay, oneMinute, oneMonth, oneWeek } from "../utils/time";

@Entity('master_configs')
export class MasterConfig extends BaseEntity {
  @Column({ type: 'varchar', default: 'Allure' })
  name: string;

  @Column({ type: 'varchar', default: 'Allure logo' })
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
    default: 5 * oneMinute,
  })
  groupBuyingRemainingTime: number;

  @Column({
    name: 'auto_cancel_order_time',
    type: 'bigint',
    default: oneDay,
  })
  autoCancelOrderTime: number;

  @Column({
    name: 'auto_complete_order_time',
    type: 'bigint',
    default: oneWeek,
  })
  autoCompleteOrderTime: number;

  @Column({
    name: 'feedback_time_expired',
    type: 'bigint',
    default: oneMonth,
  })
  feedbackTimeExpired: number;

  @Column({
    name: 'refund_time_expired',
    type: 'bigint',
    default: 15 * oneDay,
  })
  refundTimeExpired: number;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
