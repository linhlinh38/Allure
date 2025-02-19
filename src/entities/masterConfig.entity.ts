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
    name: 'waiting_pending_order_time',
    type: 'bigint',
    default: oneDay,
  })
  waitingPendingOrderTime: number;

  @Column({
    name: 'waiting_completed_order_time',
    type: 'bigint',
    default: oneWeek,
  })
  waitingCompletedOrderTime: number;

  @Column({
    name: 'waiting_completed_order_time',
    type: 'bigint',
    default: oneDay,
  })
  timeToCancelOrder: number;

  @Column({
    name: 'time_to_feedback',
    type: 'bigint',
    default: oneMonth,
  })
  timeToFeedback: number;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;
}
