import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Account } from './account.entity';

@Entity('bank_accounts')
export class BankAccount extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  accountNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  accountName: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  bankName: string;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @ManyToOne(() => Account, (account) => account.bankAccounts)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
