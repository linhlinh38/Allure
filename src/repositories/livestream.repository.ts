import { AppDataSource } from '../dataSource';
import { LiveStream } from '../entities/livestream.entity';

export const livestreamRepository = AppDataSource.getRepository(LiveStream);
