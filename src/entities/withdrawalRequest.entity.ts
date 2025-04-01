import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Account } from './account.entity';
import { WithdrawalStatusEnum } from '../utils/enum';

@Entity('withdrawal_requests')
export class WithdrawalRequest extends BaseEntity {
  @Column({ type: 'double precision', nullable: false })
  amount: number;

  @Column({ type: 'varchar', length: 255, nullable: false })
  bankName: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  accountNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  accountName: string;

  @Column({
    type: 'enum',
    enum: WithdrawalStatusEnum,
    default: WithdrawalStatusEnum.PENDING,
  })
  status: WithdrawalStatusEnum;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'processed_by_id' })
  processedBy: Account;

  @Column({ type: 'varchar', length: 255, nullable: true })
  rejectedReason: string;
}
