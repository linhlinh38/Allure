import { DataSource, In, QueryRunner, Repository } from "typeorm";
import { Account } from "../entities/account.entity";
import { BaseService } from "./base.service";
import { AppDataSource } from "../dataSource";
import { BadRequestError, EmailAlreadyExistError } from "../errors/error";
import { encryptedPassword } from "../utils/jwt";
import { RoleEnum, StatusEnum } from "../utils/enum";
import { sendRegisterAccountEmail } from "./mail.service";
import { Address } from "../entities/address.entity";
import { File } from "../entities/file.entity";
import { roleService } from "./role.service";
import { Brand } from "../entities/brand.entity";
import { StatusTracking } from "../entities/statusTracking.entity";
import { AccountUpdateStatusType } from "../dtos/request/account.request";
const repository = AppDataSource.getRepository(Account);

interface FilterOptions {
  username?: string;
  email?: string;
  role?: string;
  brand?: string;
  status?: StatusEnum;
  sortBy?: string;
  order?: string;
  limit?: number;
  page?: number;
}

class AccountService extends BaseService<Account> {
  constructor() {
    super(repository);
  }

  async getAll() {
    const accounts = await repository.find({
      relations: ["role", "brands"],
    });

    return (await accounts).map((account) => ({
      ...account,
      role: account.role ? account.role.role : null,
    }));
  }

  async getById(accountId: string) {
    const account = await repository.findOne({
      where: { id: accountId },
      relations: ["role", "brands", "cartItems", "addresses"],
    });

    if (!account) {
      throw new Error("Account not found");
    }
    return {
      ...account,
      role: account.role.role,
    };
  }

  async getBy(value: any, option: string) {
    const accounts = repository.find({
      where: {
        [option]: value,
      },
      relations: ["role", "brands", "cartItems"],
    });

    return (await accounts).map((account) => ({
      ...account,
      role: account.role ? account.role.role : null,
    }));
  }

  async filterAccounts(options: FilterOptions) {
    const { username, email, role, brand, status, sortBy, order, limit, page } =
      options;

    const queryBuilder = this.repository
      .createQueryBuilder("account")
      .leftJoinAndSelect("account.brands", "brand")
      .leftJoinAndSelect("account.role", "role")
      .leftJoinAndSelect("account.addresses", "addresses");

    if (username) {
      queryBuilder.andWhere("account.username LIKE :username", {
        username: `%${username}%`,
      });
    }

    if (email) {
      queryBuilder.andWhere("account.email LIKE :email", {
        email: `%${email}%`,
      });
    }

    if (role) {
      queryBuilder.andWhere("role.role = :role", { role });
    }

    if (brand) {
      queryBuilder.andWhere("brand.name = :brand", { brand });
    }

    if (status) {
      queryBuilder.andWhere("account.status = :status", { status });
    }

    queryBuilder
      .orderBy(`account.${sortBy}`, order.toUpperCase() as "ASC" | "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [accounts, total] = await queryBuilder.getManyAndCount();

    return {
      items: accounts,
      total,
      page,
      limit,
    };
  }

  async getStaffByBrandAndStatus(brandId: string, status?: StatusEnum) {
    const queryBuilder = this.repository
      .createQueryBuilder("account")
      .innerJoinAndSelect("account.brands", "brand", "brand.id = :brandId", {
        brandId,
      })
      .innerJoinAndSelect("account.role", "role", "role.role = :role", {
        role: RoleEnum.STAFF,
      })
      .leftJoinAndSelect("account.addresses", "addresses");

    if (status) {
      queryBuilder.andWhere("account.status = :status", { status });
    }

    const accounts = await queryBuilder.getMany();

    return (await accounts).map((account) => ({
      ...account,
      role: account.role ? account.role.role : null,
    }));
  }

  async createAccount(accountData: Account): Promise<Account> {
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
      const role = await roleService.findById(accountData.role);

      if (
        role.role === RoleEnum.KOL ||
        role.role === RoleEnum.STAFF ||
        role.role === RoleEnum.OPERATOR ||
        role.role === RoleEnum.CONSULTANT
      ) {
        accountData.isEmailVerify = true;
      } else {
        accountData.status = StatusEnum.PENDING;
      }
      let brands = [];
      if (accountData.brands && accountData.brands.length > 0) {
        const brandRepository = queryRunner.manager.getRepository(Brand);

        brands = await brandRepository.find({
          where: { id: In(accountData.brands) },
        });
      }

      accountData.brands = brands;

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
    // if (data.avatar) {
    //   const avatar: Partial<File> = {
    //     account: account,
    //     name: data.avatar.name,
    //     fileUrl: data.avatar.fileUrl,
    //     type: data.avatar.type,
    //   };
    //   await queryRunner.manager.save(File, avatar);
    // }

    if (
      data.role !== RoleEnum.CONSULTANT &&
      data.role !== RoleEnum.KOL &&
      data.certificate
    ) {
      throw new BadRequestError(
        "Certificate is only available for role CONSULTANT and KOL"
      );
    }

    const role = await roleService.findById(account.role);
    switch (role.role) {
      case RoleEnum.CUSTOMER:
        if (data.address) {
          const address: Partial<Address> = {
            account: account,
            fullName: data.address.fullName,
            phone: data.address.phone,
            district: data.address.district,
            ward: data.address.ward,
            detailAddress: data.address.detailAddress,
            province: data.address.province,
            fullAddress: data.address.fullAddress,
            type: data.address.type,
            notes: data.address.notes,
            isDefault: true,
          };
          await queryRunner.manager.save(Address, address);
        }
        await sendRegisterAccountEmail(account, data.url);
        break;
      case RoleEnum.MANAGER:
        await sendRegisterAccountEmail(account, data.url);
        break;
      case RoleEnum.STAFF:
        console.log("create staff");
        //await sendResetPasswordEmail(account);
        break;
      case RoleEnum.CONSULTANT:
        if (data.certificate) {
          const certConsultant: Partial<File> = {
            account: account,
            name: data.certificate.name,
            fileUrl: data.certificate.fileUrl,
            type: data.certificate.type,
          };
          await queryRunner.manager.save(File, certConsultant);
        }

        // await sendRegisterAccountEmail(account, data.url);
        break;
      case RoleEnum.KOL:
        if (data.certificate) {
          const certKOL: Partial<File> = {
            account: account,
            name: data.certificate.name,
            fileUrl: data.certificate.fileUrl,
            type: data.certificatel.type,
          };
          await queryRunner.manager.save(File, certKOL);
        }
        console.log("create kol");
        //await sendResetPasswordEmail(account);
        break;
      case RoleEnum.OPERATOR:
        //await sendResetPasswordEmail(account);
        console.log("create operator");

        break;
      default:
        throw new Error("Invalid role provided");
    }
  }

  async updateAccountStatus(
    updatedBy: string,
    updateData: AccountUpdateStatusType
  ) {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const account = await repository.findOneBy({
        id: updateData.accountId,
      });

      if (!account) {
        throw new Error("Account not found");
      }

      const updatedByAccount = await repository.findOneBy({ id: updatedBy });
      if (!updatedByAccount) {
        throw new Error("Updated by account not found");
      }

      await queryRunner.manager.update(Account, updateData.accountId, {
        status: updateData.status,
      });

      const statusTracking = new StatusTracking();
      statusTracking.reason = updateData.reason;
      statusTracking.status = updateData.status;
      statusTracking.updatedBy = updatedByAccount;
      statusTracking.account = account;
      await queryRunner.manager.save(StatusTracking, statusTracking);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

export const accountService = new AccountService();
