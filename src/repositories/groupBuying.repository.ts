import { AppDataSource } from '../dataSource';
import { GroupBuying } from '../entities/groupBuying.entity';

export const groupBuyingRepository = AppDataSource.getRepository(GroupBuying);
