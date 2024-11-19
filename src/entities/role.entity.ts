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
import {
  AddressEnum,
  FileEnum,
  GenderEnum,
  RoleEnum,
  StatusEnum,
} from "../utils/enum";
import { Account } from "./account.entity";

@Entity("roles")
export class Role extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  role: string;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @OneToMany(() => Account, (acc) => acc.role, { nullable: true })
  accounts?: Account[];
}
