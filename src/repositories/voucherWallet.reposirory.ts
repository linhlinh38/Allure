import { AppDataSource } from '../dataSource';
import { VoucherWallet } from '../entities/voucherWallet.entity';

export const voucherWalletRepository = AppDataSource.getRepository(VoucherWallet);
