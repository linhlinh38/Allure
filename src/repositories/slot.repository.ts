import { AppDataSource } from '../dataSource';
import { Slot } from '../entities/slot.entity';

export const slotRepository = AppDataSource.getRepository(Slot);
