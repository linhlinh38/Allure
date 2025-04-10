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
import {
  StatusEnum,
  VoucherApplyTypeEnum,
  VoucherVisibilityEnum,
} from "../utils/enum";
import { Brand } from "./brand.entity";
import { Order } from "./order.entity";
import { GroupBuyingCriteria } from "./groupBuyingCriteria.entity";
import { VoucherWallet } from "./voucherWallet.entity";
import { Product } from "./product.entity";

@Entity("vouchers")
export class Voucher extends BaseEntity {
  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 100, unique: true })
  code: string;

  @Column({
    type: "varchar",
    length: 50,
    nullable: false,
    name: "discount_type",
  })
  discountType: string;

  @Column({ type: "double precision", name: "discount_value" })
  discountValue: number;

  @Column({ type: "double precision", nullable: true, name: "max_discount" })
  maxDiscount: number;

  @Column({ type: "double precision", nullable: true, name: "min_order_value" })
  minOrderValue: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @Column({ type: "integer", nullable: true })
  amount: number;

  @Column({
    type: "timestamp with time zone",
    nullable: true,
    name: "start_time",
  })
  startTime: Date;

  @Column({
    type: "timestamp with time zone",
    nullable: true,
    name: "end_time",
  })
  endTime: Date;

  @Column({
    type: "enum",
    enum: VoucherApplyTypeEnum,
    default: VoucherApplyTypeEnum.ALL,
    name: "apply_type",
  })
  applyType: VoucherApplyTypeEnum;

  @Column({
    type: "enum",
    enum: VoucherVisibilityEnum,
    default: VoucherVisibilityEnum.PUBLIC,
  })
  visibility: VoucherVisibilityEnum;

  @ManyToOne(() => Brand, (brand) => brand.vouchers)
  @JoinColumn({ name: "brand_id" })
  brand: Brand;

  @OneToMany(() => Order, (order) => order.voucher)
  orders: Order[];

  @OneToMany(() => VoucherWallet, (wallet) => wallet.voucher, { cascade: true })
  wallets: VoucherWallet[];

  @ManyToMany(() => Product)
  @JoinTable({
    name: "voucher_apply_product",
    joinColumn: { name: "account_id", referencedColumnName: "id" },
    inverseJoinColumn: { name: "product_id", referencedColumnName: "id" },
  })
  applyProducts: Product[];

  @OneToMany(() => GroupBuyingCriteria, (criteria) => criteria.voucher)
  criterias: GroupBuyingCriteria[];
}
