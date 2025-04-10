import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Account } from "./account.entity";
import { WithdrawalStatusEnum } from "../utils/enum";
import { File } from "./file.entity";

@Entity("withdrawal_requests")
export class WithdrawalRequest extends BaseEntity {
  @Column({ type: "double precision", nullable: false })
  amount: number;

  @Column({ type: "varchar", length: 255, nullable: false, name: "bank_name" })
  bankName: string;

  @Column({
    type: "varchar",
    length: 255,
    nullable: false,
    name: "account_number",
  })
  accountNumber: string;

  @Column({
    type: "varchar",
    length: 255,
    nullable: false,
    name: "account_name",
  })
  accountName: string;

  @Column({
    type: "enum",
    enum: WithdrawalStatusEnum,
    default: WithdrawalStatusEnum.PENDING,
  })
  status: WithdrawalStatusEnum;

  @ManyToOne(() => Account)
  @JoinColumn({ name: "account_id" })
  account: Account;

  @ManyToOne(() => Account)
  @JoinColumn({ name: "processed_by_id" })
  processedBy: Account;

  @OneToMany(() => File, (evidence) => evidence.withdrawalRequest, {
    cascade: true,
  })
  evidences: File[];

  @Column({
    type: "varchar",
    length: 255,
    nullable: true,
    name: "rejected_reason",
  })
  rejectedReason: string;
}
