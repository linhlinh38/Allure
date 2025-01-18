import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { Account } from "./account.entity";
import { Brand } from "./brand.entity";
import { Order } from "./order.entity";

@Entity('status-trackings')
export class StatusTracking extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  reason: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  status: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'updated_by' })
  updatedBy: Account;

  @ManyToOne(() => Account, (account) => account.statusTrackings, {
    nullable: true,
  })
  @JoinColumn({ name: 'account' })
  account: Account;

  @ManyToOne(() => Brand, (brand) => brand.statusTrackings, {
    nullable: true,
  })
  @JoinColumn({ name: 'brand' })
  brand: Brand;

  @ManyToOne(() => Order, (order) => order.statusTrackings, {
    nullable: true,
  })
  @JoinColumn({ name: 'order' })
  order: Order;
}
