import { AppDataSource } from '../dataSource';
import { Voucher } from '../entities/voucher.entity';

export const voucherRepository = AppDataSource.getRepository(Voucher);
