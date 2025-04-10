import { Column, Entity, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Account } from "./account.entity";

@Entity("wallets")
export class Wallet extends BaseEntity {
  @Column({ type: "double precision", nullable: false, default: 0 })
  balance: number;

  @Column({
    type: "double precision",
    nullable: false,
    default: 0,
    name: "available_balance",
  })
  availableBalance: number;

  @OneToOne(() => Account, (account) => account.wallet)
  @JoinColumn({ name: "account_id" })
  owner: Account;
}
