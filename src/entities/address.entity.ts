import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { AddressEnum, GenderEnum, RoleEnum, StatusEnum } from "../utils/enum";
import { Account } from "./account.entity";

@Entity("addresses")
export class Address extends BaseEntity {
  @Column({ type: "varchar", length: 100, nullable: true })
  number?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  building?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  street?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  ward?: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  city: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  province: string;

  @Column({
    name: "full_address",
    type: "varchar",
    length: 100,
    nullable: true,
  })
  fullAddress?: string;

  @Column({
    type: "enum",
    enum: AddressEnum,
    default: AddressEnum.OTHER,
  })
  type: AddressEnum;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @Column({ name: "is_default", type: "boolean", default: false })
  isDefault: boolean;

  @ManyToOne(() => Account, (account) => account.addresses)
  @JoinColumn({ name: "account_id" })
  account: Account;
}
