import { Column, Entity, ManyToMany, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { BrandStatusEnum } from "../utils/enum";
import { Account } from "./account.entity";
import { Follow } from "./follow.entity";
import { Expose } from "class-transformer";
import { Voucher } from "./voucher.entity";
import { StatusTracking } from "./statusTracking.entity";
import { Product } from "./product.entity";
import { Transaction } from "./transaction.entity";
import { Order } from "./order.entity";
import { GroupProduct } from "./groupProduct.entity";
import { File } from "./file.entity";
import { Booking } from "./booking.entity";

@Entity("brands")
export class Brand extends BaseEntity {
  @Expose()
  @Column({ type: "varchar", length: 100, unique: true })
  name: string;

  @Expose()
  @Column({ type: "varchar", length: 255 })
  logo: string;

  @OneToMany(() => File, (document) => document.brand, { cascade: true })
  documents: File[];

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
  @Column({ type: "varchar", length: 100 })
  businessTaxCode: string;

  @Expose()
  @Column({ type: "varchar", length: 100 })
  businessRegistrationCode: string;

  @Expose()
  @Column({ type: "date" })
  establishmentDate: Date;

  @Expose()
  @Column({ type: "varchar", length: 100 })
  province: string;

  @Expose()
  @Column({ type: "varchar", length: 100 })
  district: string;

  @Expose()
  @Column({ type: "varchar", length: 100 })
  ward: string;

  @Expose()
  @Column({ type: "varchar", length: 255 })
  businessRegistrationAddress: string;

  @Column({ type: "integer", name: "current_update_profile_time", default: 0 })
  currentUpdateProfileTime: number;

  @Column({
    type: "enum",
    enum: BrandStatusEnum,
    default: BrandStatusEnum.PENDING_REVIEW,
  })
  status: BrandStatusEnum;

  @OneToMany(() => Voucher, (voucher) => voucher.brand)
  vouchers: Brand[];

  @OneToMany(() => Order, (order) => order.brand)
  orders: Order[];

  @OneToMany(() => GroupProduct, (groupProduct) => groupProduct.brand)
  groupProducts: GroupProduct[];

  @OneToMany(() => StatusTracking, (statusTracking) => statusTracking.brand)
  statusTrackings: StatusTracking[];

  @OneToMany(() => Product, (product) => product.brand)
  products: Product[];

  @OneToMany(() => Transaction, (transaction) => transaction.brand)
  transactions: Transaction[];

  @OneToMany(() => Booking, (booking) => booking.brand)
  bookings: Booking[];
}
