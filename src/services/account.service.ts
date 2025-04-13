import { In, QueryRunner } from "typeorm";
import { Account } from "../entities/account.entity";
import { BaseService } from "./base.service";
import { AppDataSource } from "../dataSource";
import { BadRequestError, EmailAlreadyExistError } from "../errors/error";
import { encryptedPassword } from "../utils/jwt";
import {
  AccountStatusEnum,
  BookingStatusEnum,
  FileEnum,
  ReportStatusEnum,
  RoleEnum,
} from "../utils/enum";
import {
  sendBannedAccountEmail,
  sendRegisterAccountEmail,
} from "./mail.service";
import { Address } from "../entities/address.entity";
import { File } from "../entities/file.entity";
import { roleService } from "./role.service";
import { Brand } from "../entities/brand.entity";
import { StatusTracking } from "../entities/statusTracking.entity";
import { AccountUpdateStatusType } from "../dtos/request/account.request";
import { consultationResultRepository } from "../repositories/consultationResult.repository";
import { productClassificationRepository } from "../repositories/productClassification.repository";
import { bookingRepository } from "../repositories/booking.repository";
import { reportRepository } from "../repositories/report.repository";
const repository = AppDataSource.getRepository(Account);

interface FilterOptions {
  username?: string;
  email?: string;
  role?: string[];
  brand?: string;
  status?: AccountStatusEnum[];
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
      relations: {
        role: true,
        brands: {
          reviewer: true,
        },
        cartItems: true,
        addresses: true,
        bankAccounts: true,
        files: true,
      },
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
      relations: [
        "role",
        "brands",
        "cartItems",
        "addresses",
        "bankAccounts",
        "files",
      ],
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
      .leftJoinAndSelect("account.addresses", "addresses")
      .leftJoinAndSelect("account.files", "files")
      .leftJoinAndSelect("account.consultantServices", "consultantServices")
      .leftJoinAndSelect("consultantServices.systemService", "systemService");

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

    if (role && Array.isArray(role)) {
      queryBuilder.andWhere("role.role IN (:...roles)", { roles: role });
    } else if (role) {
      queryBuilder.andWhere("role.role = :role", { role });
    }

    if (brand) {
      queryBuilder.andWhere("brand.name = :brand", { brand });
    }

    if (status && Array.isArray(status)) {
      queryBuilder.andWhere("account.status IN (:...statuses)", {
        statuses: status,
      });
    } else if (status) {
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

  async getStaffByBrandAndStatus(brandId: string, status?: AccountStatusEnum) {
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

      const checkUsername = await accountService.findBy(
        accountData.username,
        "username"
      );
      if (checkUsername.length !== 0) {
        throw new BadRequestError("Username already exists!");
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
        accountData.status = AccountStatusEnum.PENDING;
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
            isDefault: false,
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
        if (data.certificates && data.certificates.length !== 0) {
          for (const cert of data.certificates) {
            const certConsultant: Partial<File> = {
              account: account,
              name: cert.name ?? null,
              fileUrl: cert.fileUrl,
              type: FileEnum.CERTIFICATE,
            };
            await queryRunner.manager.save(File, certConsultant);
          }
        }
        if (data.thumbnailImageList && data.thumbnailImageList.length !== 0) {
          for (const img of data.thumbnailImageList) {
            const thumbnail: Partial<File> = {
              account: account,
              name: img.name ?? null,
              fileUrl: img.fileUrl,
              type: FileEnum.CONSULTANT_THUMBNAIL,
            };
            await queryRunner.manager.save(File, thumbnail);
          }
        }

        // await sendRegisterAccountEmail(account, data.url);
        break;
      case RoleEnum.KOL:
        if (data.certificates && data.certificates.length !== 0) {
          for (const cert of data.certificates) {
            const certKOL: Partial<File> = {
              account: account,
              name: cert.name ?? null,
              fileUrl: cert.fileUrl,
              type: FileEnum.CERTIFICATE,
            };
            await queryRunner.manager.save(File, certKOL);
          }
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

  async updateAccount(accountId: string, accountData: any): Promise<Account> {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the account to update
      const account = await queryRunner.manager.findOne(Account, {
        where: { id: accountId },
        relations: ["files"],
      });

      if (!account) {
        throw new Error("Account not found");
      }

      // Update basic account information
      if (accountData.password) {
        accountData.password = await encryptedPassword(accountData.password);
      }

      if (accountData.username) {
        const checkExist = await queryRunner.manager.findOne(Account, {
          where: { username: accountData.username },
        });
        if (checkExist && checkExist.id !== account.id) {
          throw new BadRequestError("Username already exists");
        }
      }

      queryRunner.manager.merge(Account, account, accountData);
      await queryRunner.manager.save(account);

      // Handle certificates
      if (accountData.certificates && accountData.certificates.length > 0) {
        // Remove old certificates
        await queryRunner.manager.delete(File, {
          account: { id: accountId },
          type: FileEnum.CERTIFICATE,
        });

        // Add new certificates
        for (const cert of accountData.certificates) {
          const certFile: Partial<File> = {
            account: account,
            name: cert.name ?? null,
            fileUrl: cert.fileUrl,
            type: FileEnum.CERTIFICATE,
          };
          await queryRunner.manager.save(File, certFile);
        }
      }

      // Handle thumbnail images
      if (
        accountData.thumbnailImageList &&
        accountData.thumbnailImageList.length > 0
      ) {
        // Remove old thumbnails
        await queryRunner.manager.delete(File, {
          account: { id: accountId },
          type: FileEnum.CONSULTANT_THUMBNAIL,
        });

        // Add new thumbnails
        for (const img of accountData.thumbnailImageList) {
          const thumbnailFile: Partial<File> = {
            account: account,
            name: img.name ?? null,
            fileUrl: img.fileUrl,
            type: FileEnum.CONSULTANT_THUMBNAIL,
          };
          await queryRunner.manager.save(File, thumbnailFile);
        }
      }

      await queryRunner.commitTransaction();
      return account;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
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

  async calculateBrandRecommendationPercentage(consultantId: string) {
    const consultant = await repository.findOne({
      where: { id: consultantId },
      relations: ["role", "brands", "addresses", "files"],
    });

    if (!consultant) {
      throw new Error("Consultant not found");
    }
    const monthlyData = await bookingRepository
      .createQueryBuilder("booking")
      .select("to_char(date(booking.createdAt), 'YYYY-MM')", "month")
      .addSelect("COUNT(booking.id)", "totalBookings")
      .addSelect("SUM(booking.totalPrice)", "totalRevenue")
      .leftJoin("booking.consultantService", "consultantService")
      .leftJoin("consultantService.account", "account")
      .where("account.id = :consultantId", { consultantId })
      .andWhere("booking.status = :status", {
        status: BookingStatusEnum.COMPLETED,
      })
      .groupBy("to_char(date(booking.createdAt), 'YYYY-MM')")
      .orderBy("month", "ASC")
      .getRawMany();

    // Query to calculate total bookings grouped by service in each month
    const serviceMonthlyData = await bookingRepository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.consultantService", "consultantService")
      .leftJoinAndSelect("consultantService.account", "account")
      .leftJoinAndSelect("consultantService.systemService", "systemService")
      .select("to_char(date(booking.createdAt), 'YYYY-MM')", "month")
      .addSelect("consultantService.id", "serviceId")
      .addSelect("systemService.name", "serviceName")
      .addSelect("COUNT(booking.id)", "totalBookings")
      .addSelect("SUM(booking.totalPrice)", "totalRevenue")
      .where("account.id = :consultantId", { consultantId })
      .andWhere("booking.status = :status", {
        status: BookingStatusEnum.COMPLETED,
      })
      .groupBy("to_char(date(booking.createdAt), 'YYYY-MM')")
      .addGroupBy("consultantService.id")
      .addGroupBy("systemService.name")
      .orderBy("month", "ASC")
      .addOrderBy("systemService.name", "ASC")
      .getRawMany();
    const consultationResults = await consultationResultRepository.find({
      where: {
        booking: { consultantService: { account: { id: consultantId } } },
      },
      select: ["suggestedProductClassifications"],
    });

    const productClassificationIds = consultationResults
      .flatMap((result) => result.suggestedProductClassifications)
      .map((item) => item.productClassificationId);

    const productClassifications = await productClassificationRepository.find({
      where: { id: In(productClassificationIds) },
      relations: ["product", "product.brand"],
    });

    const brandCounts: Record<string, number> = {};
    const totalSuggestions = productClassifications.length;

    productClassifications.forEach((classification) => {
      const brandId = classification.product.brand.id;
      brandCounts[brandId] = (brandCounts[brandId] || 0) + 1;
    });

    const brandPercentages = Object.entries(brandCounts).map(
      ([brandId, count]) => ({
        brandId,
        percentage: (count / totalSuggestions) * 100,
      })
    );

    return {
      consultant: {
        name: consultant.username,
        email: consultant.email,
        introduceVideo: consultant.introduceVideo,
        role: consultant.role?.role,
        brands: consultant.brands.map((brand) => ({
          id: brand.id,
          name: brand.name,
        })),
        addresses: consultant.addresses,
        files: consultant.files,
      },
      brandRecommendations: brandPercentages,
      totalProductSuggestions: totalSuggestions,
      productSuggestList: productClassifications,
      monthlyData,
      serviceMonthlyData,
    };
  }

  async checkAllAccountsAndBanIfNecessary(): Promise<void> {
    // Get all accounts with the role CUSTOMER
    const customerAccounts = await this.repository.find({
      where: { role: { role: RoleEnum.CUSTOMER } },
      relations: ["role"],
    });

    for (const account of customerAccounts) {
      // Count the number of approved reports for the account
      const approvedReportsCount = await reportRepository
        .createQueryBuilder("report")
        .leftJoinAndSelect("report.account", "account")
        .where("account.id = :accountId", { accountId: account.id })
        .andWhere("report.status = :status", {
          status: ReportStatusEnum.APPROVED,
        })
        .getCount();

      // If the count exceeds 15, update the account's status to BANNED
      if (approvedReportsCount > 15) {
        account.status = AccountStatusEnum.BANNED;
        await this.repository.save(account);
        await sendBannedAccountEmail(account.email, account.username);
      }
    }
  }
}

export const accountService = new AccountService();
