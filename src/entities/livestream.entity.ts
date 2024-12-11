import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { StatusEnum } from '../utils/enum';
import { Account } from './account.entity';
import { Order } from './order.entity';

@Entity('livestreams')
export class LiveStream extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: true })
  title: string;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  record: string;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @ManyToOne(() => Account, (account) => account.files)
  @JoinColumn({ name: 'accountId' })
  account: Account;

  @OneToMany(() => Order, (order) => order.livestream)
  orders: Order[];
}
