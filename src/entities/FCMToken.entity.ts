import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Account } from './account.entity';

@Entity('fcm_tokens')
export class FCMToken extends BaseEntity {
  @Column({ type: 'varchar'})
  token: string;

  @OneToOne(() => Account, (account) => account.fcmToken)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
