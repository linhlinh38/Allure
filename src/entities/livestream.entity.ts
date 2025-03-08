import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { LiveStreamEnum, StatusEnum } from "../utils/enum";
import { Account } from "./account.entity";
import { Order } from "./order.entity";
import { Product } from "./product.entity";

@Entity("livestreams")
export class LiveStream extends BaseEntity {
  @Column({ type: "varchar", length: 100, nullable: true })
  title: string;

  @Column({ type: "timestamp", name: "start_time" })
  startTime: Date;

  @Column({ type: "timestamp", name: "end_time", nullable: true })
  endTime: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  record: string;

  @Column({
    type: "enum",
    enum: LiveStreamEnum,
    default: LiveStreamEnum.SCHEDULED,
  })
  status: LiveStreamEnum;

  @ManyToOne(() => Account)
  @JoinColumn({ name: "account_id" })
  account: Account;

  @OneToMany(() => Order, (order) => order.livestream)
  orders: Order[];

  @ManyToMany(() => Product, (product) => product.groupProducts, {
    cascade: true,
  })
  @JoinTable({
    name: "livestream_products",
    joinColumn: {
      name: "livestreamId",
      referencedColumnName: "id",
    },
    inverseJoinColumn: {
      name: "productId",
      referencedColumnName: "id",
    },
  })
  products: Product[];
}
