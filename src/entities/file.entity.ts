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
  FileEnum,
  StatusEnum,
} from "../utils/enum";
import { Account } from "./account.entity";

@Entity("files")
export class File extends BaseEntity {
  @Column({ type: "varchar", length: 100, nullable: true })
  name?: string;

  @Column({ type: "varchar", length: 100, nullable: false })
  fileUrl: string;

  @Column({
    type: "enum",
    enum: FileEnum,
  })
  type: FileEnum;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @ManyToOne(() => Account, (account) => account.files)
  @JoinColumn({ name: "accountId" })
  account: Account;
}
