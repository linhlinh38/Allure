import { AppDataSource } from "../dataSource";
import { Follow } from "../entities/follow.entity";
import { GroupBuyingCriteria } from "../entities/groupBuyingCriteria.entity";

export const criteriaRepository = AppDataSource.getRepository(GroupBuyingCriteria);
