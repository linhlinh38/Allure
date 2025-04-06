import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Account } from "./account.entity";

@Entity("bank_accounts")
export class BankAccount extends BaseEntity {
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

  @Column({ type: "varchar", length: 255, nullable: false, name: "bank_name" })
  bankName: string;

  @Column({ type: "boolean", default: false, name: "is_default" })
  isDefault: boolean;

  @ManyToOne(() => Account, (account) => account.bankAccounts)
  @JoinColumn({ name: "account_id" })
  account: Account;
}
