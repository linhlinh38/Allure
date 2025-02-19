import { AppDataSource } from '../dataSource';
import { Reply } from '../entities/reply.entity';

export const replyRepository = AppDataSource.getRepository(
  Reply
);
