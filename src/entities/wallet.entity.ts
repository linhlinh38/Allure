import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Account } from './account.entity';

@Entity('wallets')
export class Wallet extends BaseEntity {
  @Column({ type: 'double precision', nullable: false, default: 0 })
  balance: number;

  @OneToOne(() => Account, (account) => account.wallet)
  @JoinColumn({ name: 'account_id' })
  owner: Account;
}
