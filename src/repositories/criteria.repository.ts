import { AppDataSource } from "../dataSource";
import { GroupBuyingCriteria } from "../entities/groupBuyingCriteria.entity";

export const criteriaRepository = AppDataSource.getRepository(GroupBuyingCriteria);
