import { AppDataSource } from '../dataSource';
import { Wallet } from '../entities/wallet.entity';

export const walletRepository = AppDataSource.getRepository(Wallet);
