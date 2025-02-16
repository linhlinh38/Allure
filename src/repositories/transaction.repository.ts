import { AppDataSource } from '../dataSource';
import { Transaction } from '../entities/transaction.entity';

export const transactionRepository = AppDataSource.getRepository(Transaction);
