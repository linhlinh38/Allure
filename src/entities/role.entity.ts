import {
  Column,
  Entity,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  RoleEnum,
  StatusEnum,
} from '../utils/enum';
import { Account } from './account.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ type: 'enum', enum: RoleEnum, default: RoleEnum.CUSTOMER })
  role: RoleEnum;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @OneToMany(() => Account, (acc) => acc.role, { nullable: true })
  accounts?: Account[];
}
