import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { VoucherWalletStatus } from '../utils/enum';
import { Voucher } from './voucher.entity';
import { Account } from './account.entity';

@Entity('voucher_wallets')
export class VoucherWallet extends BaseEntity {
  @Column({
    type: 'enum',
    enum: VoucherWalletStatus,
    default: VoucherWalletStatus.NOT_USED,
  })
  status: VoucherWalletStatus;

  @ManyToOne(() => Voucher, (voucher) => voucher.wallets)
  @JoinColumn({ name: 'voucher_id' })
  voucher: Voucher;

  @ManyToOne(() => Account, (account) => account.voucherWallet)
  @JoinColumn({ name: 'account_id' })
  owner: Account;
}
