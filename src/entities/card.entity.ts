import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Account } from './account.entity';

@Entity('cards')
export class Card extends BaseEntity {
  @Column({ unique: true })
  cardNumber: string;

  @Column()
  cardHolder: string;

  @Column()
  expirationDate: Date;

  @Column()
  bankName: string;

  @Column({ length: 3 })
  cvv: string;

  @Column({ default: false })
  isDefault: boolean;

  @ManyToOne(() => Account, (account) => account.cards)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
