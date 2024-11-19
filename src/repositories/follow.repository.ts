import { AppDataSource } from "../dataSource";
import { Follow } from "../entities/follow.entity";

export const followRepository = AppDataSource.getRepository(Follow);
