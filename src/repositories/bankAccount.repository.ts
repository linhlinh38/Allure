import { AppDataSource } from "../dataSource";
import { BankAccount } from "../entities/bankAccount.entity";

export const bankAccountRepository = AppDataSource.getRepository(BankAccount);
