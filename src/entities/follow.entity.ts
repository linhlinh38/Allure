import {
  Entity,
  JoinColumn,
  ManyToOne,
} from 'typeorm';
import { Account } from './account.entity';
import { Brand } from './brand.entity';
import { BaseEntity } from './base.entity';

@Entity('follows')
export class Follow extends BaseEntity {
  @ManyToOne(() => Account, (account) => account.follows)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @ManyToOne(() => Brand, (brand) => brand.follows)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;
}
