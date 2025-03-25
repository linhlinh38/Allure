import { AppDataSource } from '../dataSource';
import { FCMToken } from '../entities/FCMToken.entity';

export const fcmTokenRepository =
  AppDataSource.getRepository(FCMToken);
