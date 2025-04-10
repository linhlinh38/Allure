import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Account } from './account.entity';

@Entity('fcm_tokens')
export class FCMToken extends BaseEntity {
  @Column({ type: 'varchar'})
  token: string;

  @ManyToOne(() => Account, (account) => account.fcmTokens)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
