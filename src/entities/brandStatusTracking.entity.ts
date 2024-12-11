import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { StatusEnum } from '../utils/enum';
import { Account } from './account.entity';
import { Brand } from './brand.entity';

@Entity('brand-status-trackings')
export class BrandStatusTracking extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  reason: string;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.PENDING,
  })
  status: StatusEnum;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'updated_by' })
  updatedBy: Account;

  @ManyToOne(() => Brand, (brand) => brand.statusTrackings)
  @JoinColumn({ name: 'brand' })
  brand: Brand;
}
