import { AppDataSource } from "../dataSource";
import { Account } from "../entities/account.entity";

export const accountRepository = AppDataSource.getRepository(Account);