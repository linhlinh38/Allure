import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Account } from './account.entity';
import { TransactionEnum } from '../utils/enum';

@Entity('transactions')
export class Transaction extends BaseEntity {
  @Column({ type: 'varchar', nullable: false, default: 0 })
  from: string;

  @Column({ type: 'varchar', nullable: false, default: 0 })
  to: string;

  @Column({ type: 'double precision', nullable: false, default: 0 })
  amount: number;

  @Column({
    type: 'enum',
    enum: TransactionEnum,
    default: TransactionEnum.ORDER,
  })
  type: TransactionEnum;

  @OneToOne(() => Account, (account) => account.wallet)
  @JoinColumn({ name: 'account_id' })
  owner: Account;
}
