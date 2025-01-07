import {
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { StatusEnum } from "../utils/enum";
import { Account } from "./account.entity";
import { Follow } from "./follow.entity";
import { Expose } from "class-transformer";
import { Voucher } from "./voucher.entity";
import { StatusTracking } from "./statusTracking.entity";

@Entity("brands")
export class Brand extends BaseEntity {
  @Expose()
  @Column({ type: "varchar", length: 100, unique: true })
  name: string;

  @Expose()
  @Column({ type: "varchar", length: 255 })
  logo: string;

  @Expose()
  @Column({ type: "varchar", length: 255, nullable: false })
  document: string;

  @Expose()
  @Column({ type: "varchar", length: 255 })
  description: string;

  @ManyToMany(() => Account, (account) => account.brands)
  accounts: Account[];

  @OneToMany(() => Follow, (follows) => follows.brand)
  follows: Follow[];

  @Expose()
  @Column({ type: "varchar", length: 255, nullable: false })
  email: string;

  @Expose()
  @Column({ type: "varchar", length: 15, nullable: true })
  phone: string;

  @Expose()
  @Column({ type: "varchar", length: 255 })
  address: string;

  @Expose()
  @Column({ type: "varchar", length: 100, nullable: true })
  businessTaxCode: string;

  @Expose()
  @Column({ type: "varchar", length: 100, nullable: true })
  businessRegistrationCode: string;

  @Expose()
  @Column({ type: "date", nullable: true })
  establishmentDate: Date;

  @Expose()
  @Column({ type: "varchar", length: 100, nullable: true })
  province: string;

  @Expose()
  @Column({ type: "varchar", length: 100, nullable: true })
  district: string;

  @Expose()
  @Column({ type: "varchar", length: 100, nullable: true })
  ward: string;

  @Expose()
  @Column({ type: "varchar", length: 255, nullable: true })
  businessRegistrationAddress: string;

  @Column({ type: "float", default: 0 })
  star: number;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.PENDING,
  })
  status: StatusEnum;

  @OneToMany(() => Voucher, (voucher) => voucher.brand)
  vouchers: Brand[];

  @OneToMany(() => StatusTracking, (statusTracking) => statusTracking.brand)
  statusTrackings: StatusTracking[];
}
