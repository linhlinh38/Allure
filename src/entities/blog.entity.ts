import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "./base.entity";

import { Account } from "./account.entity";
import { BlogEnum, BlogTypeEnum } from "../utils/enum";

@Entity("blogs")
export class Blog extends BaseEntity {
  @Column({ type: "varchar" })
  title: string;

  @Column({ type: "varchar" })
  content: string;

  @Column({ type: "varchar", nullable: true })
  tag: string;

  @Column({
    type: "enum",
    enum: BlogTypeEnum,
    default: BlogTypeEnum.BLOG,
  })
  type: BlogTypeEnum;

  @Column({
    type: "enum",
    enum: BlogEnum,
    default: BlogEnum.UN_PUBLISHED,
  })
  status: BlogEnum;

  @ManyToOne(() => Account)
  @JoinColumn({ name: "account_id" })
  author: Account;
}
