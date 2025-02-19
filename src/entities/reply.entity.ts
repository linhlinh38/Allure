import { Entity, Column, ManyToOne, JoinColumn} from "typeorm";
import { BaseEntity } from "./base.entity";

import { Feedback } from "./feedback.entity";
import { Account } from "./account.entity";

@Entity('replies')
export class Reply extends BaseEntity {
  @Column({ type: 'varchar' })
  content: string;

  @ManyToOne(() => Feedback, (feedback) => feedback.replies)
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'account_id' })
  account: Account;
}
