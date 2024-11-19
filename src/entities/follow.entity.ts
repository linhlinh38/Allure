import {
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';
import { Account } from './account.entity';
import { Brand } from './brand.entity';
import { BaseEntity } from './base.entity';

@Entity()
export class Follow extends BaseEntity {
  @ManyToOne(() => Account, (account) => account.follows)
  account: Account;

  @ManyToOne(() => Brand, (brand) => brand.follows)
  brand: Brand;
}
