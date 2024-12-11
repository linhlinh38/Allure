import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { FileEnum, StatusEnum } from '../utils/enum';
import { Account } from './account.entity';
import { Order } from './order.entity';

@Entity('group_buyings')
export class GroupBuying extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  fileUrl: string;

  @Column({
    type: 'enum',
    enum: FileEnum,
  })
  type: FileEnum;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @ManyToOne(() => Account, (account) => account.files)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @OneToMany(() => Order, (order) => order.groupBuying)
  orders: Order[];
}
