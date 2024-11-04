import { DataSource, QueryRunner, Repository } from "typeorm";
import { Account } from "../entities/account.entity";
import { BaseService } from "./base.service";
import { AppDataSource } from "../dataSource";
import { EmailAlreadyExistError } from "../errors/error";
import { encryptedPassword } from "../utils/jwt";
import { RoleEnum, StatusEnum } from "../utils/enum";
import { Customer } from "../entities/customer.entity";
import { Manager } from "../entities/manager.entity";
import { Staff } from "../entities/staff.entity";
import { Consultant } from "../entities/consultant.entity";
import { KOL } from "../entities/KOL.entity";
import { Operator } from "../entities/operator.entity";
import {
  sendRegisterAccountEmail,
  sendResetPasswordEmail,
} from "./mail.service";
const repository = AppDataSource.getRepository(Account);
class AccountService extends BaseService<Account> {
  constructor() {
    super(repository);
  }

  async createAccount(accountData: Partial<Account>): Promise<Account> {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const checkEmail = await accountService.findBy(
        accountData.email,
        "email"
      );
      if (checkEmail.length !== 0) {
        throw new EmailAlreadyExistError("Email already exists!");
      }

      if (accountData.password) {
        accountData.password = await encryptedPassword(accountData.password);
      }

      accountData.status = StatusEnum.PENDING;
      const createdAccount = await queryRunner.manager.save(
        Account,
        accountData
      );

      await this.insertRelatedEntityBasedOnRole(
        queryRunner,
        createdAccount,
        accountData
      );

      await queryRunner.commitTransaction();

      return createdAccount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async insertRelatedEntityBasedOnRole(
    queryRunner: QueryRunner,
    account: Account,
    data: any
  ) {
    switch (account.role) {
      case RoleEnum.CUSTOMER:
        const customer: Partial<Customer> = {
          account: account,
          address: data.address,
        };
        await queryRunner.manager.save(Customer, customer);
        await sendRegisterAccountEmail(account);
        break;
      case RoleEnum.MANAGER:
        const manager: Partial<Manager> = {
          account: account,
        };
        await queryRunner.manager.save(Manager, manager);
        await sendRegisterAccountEmail(account);
        break;
      case RoleEnum.STAFF:
        const staff: Partial<Staff> = {
          account: account,
        };
        await queryRunner.manager.save(Staff, staff);
        await sendResetPasswordEmail(account);
        break;
      case RoleEnum.CONSULTANT:
        const consultant: Partial<Consultant> = {
          account: account,
          yoe: data.yoe,
          certificates: data.certificates,
        };
        await queryRunner.manager.save(Consultant, consultant);
        await sendRegisterAccountEmail(account);
        break;
      case RoleEnum.KOL:
        const kol: Partial<KOL> = {
          account: account,
          yoe: data.yoe,
          certificates: data.certificates,
        };
        await queryRunner.manager.save(KOL, kol);
        await sendResetPasswordEmail(account);
        break;
      case RoleEnum.OPERATION:
        const operator: Partial<Operator> = {
          account: account,
        };
        await queryRunner.manager.save(Operator, operator);
        await sendResetPasswordEmail(account);
        break;
      default:
        throw new Error("Invalid role provided");
    }
  }
}

export const accountService = new AccountService();
