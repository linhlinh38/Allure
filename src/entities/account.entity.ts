import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
} from "typeorm";
import { BaseEntity } from "./base.entity";
import { GenderEnum, RoleEnum, StatusEnum } from "../utils/enum";
import { Address } from "./address.entity";
import { File } from "./file.entity";
import { Role } from "./role.entity";
import { Brand } from "./brand.entity";
import { Follow } from "./follow.entity";
import { Order } from "./order.entity";
import { CartItem } from "./cartItem.entity";
import { GroupBuying } from "./groupBuying.entity";
import { VoucherWallet } from "./voucherWallet.entity";
import { StatusTracking } from "./statusTracking.entity";
import { Wallet } from "./wallet.entity";

@Entity('accounts')
export class Account extends BaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName: string;

  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  username?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  avatar?: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  email: string;

  @Column({ name: 'is_email_verify', type: 'boolean', default: false })
  isEmailVerify: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  password: string;

  @ManyToOne(() => Role, (role) => role.accounts)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({
    type: 'enum',
    enum: GenderEnum,
    nullable: true,
  })
  gender: GenderEnum;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phone?: string;

  @Column({ type: 'timestamp', nullable: true })
  dob?: Date;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.PENDING,
  })
  status: StatusEnum;

  @Column({ type: 'bigint', nullable: true })
  yoe: number;

  @OneToMany(() => Address, (address) => address.account, { nullable: true })
  addresses?: Address[];

  @OneToMany(() => File, (file) => file.account, { nullable: true })
  files?: File[];

  @OneToMany(() => CartItem, (cartItem) => cartItem.account, { nullable: true })
  @JoinColumn({ name: 'cart_items' })
  cartItems?: CartItem[];

  @ManyToMany(() => Brand, (brand) => brand.accounts)
  @JoinTable({
    name: 'account_brand_role',
    joinColumn: { name: 'account_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'brand_id', referencedColumnName: 'id' },
  })
  brands: Brand[];

  @OneToMany(() => Follow, (follows) => follows.account)
  follows: Follow[];

  @OneToMany(() => Order, (order) => order.account)
  orders: Order[];

  @OneToMany(() => GroupBuying, (groupBuying) => groupBuying.creator)
  groupBuyings: GroupBuying[];

  @OneToMany(() => VoucherWallet, (wallet) => wallet.owner)
  voucherWallet: VoucherWallet[];

  @OneToMany(() => StatusTracking, (statusTracking) => statusTracking.account)
  statusTrackings: StatusTracking[];

  @OneToOne(() => Wallet, (wallet) => wallet.owner)
  wallet: Wallet;
}
