import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { StatusEnum } from '../utils/enum';
import { Account } from './account.entity';
import { Order } from './order.entity';
import { GroupBuyingCriteria } from './groupBuyingCriteria.entity';
import { GroupProduct } from './groupProduct.entity';

@Entity('group_buyings')
export class GroupBuying extends BaseEntity {
  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @ManyToOne(() => Account, (account) => account.groupBuyings)
  @JoinColumn({ name: 'creator_id' })
  creator: Account;

  @OneToMany(() => Order, (order) => order.groupBuying)
  orders: Order[];

  @OneToOne(() => GroupBuyingCriteria, (criteria) => criteria.groupBuying, {
    nullable: true,
  })
  @JoinColumn()
  criteria: GroupBuyingCriteria;

  @ManyToOne(() => GroupProduct, (groupProduct) => groupProduct.groupBuyings)
  @JoinColumn({ name: 'group_product' })
  groupProduct: GroupProduct;
}
