import { QueryRunner } from "typeorm";
import { AppDataSource } from "../dataSource";
import { Transaction } from "../entities/transaction.entity";
import {
  BookingStatusEnum,
  OrderEnum,
  PaymentMethodEnum,
  PayTypeEnum,
  RoleEnum,
  ShippingStatusEnum,
  StatisticsTimeEnum,
  TransactionTypeEnum,
} from "../utils/enum";
import { BaseService } from "./base.service";
import { Order } from "../entities/order.entity";
import { GroupBuying } from "../entities/groupBuying.entity";
import {
  FilterTransactionRequest,
  GetDailyOrderStatisticsRequest,
  GetStatisticsRequest,
  PayRequest,
} from "../dtos/request/transaction.request";
import { orderRepository } from "../repositories/order.repository";
import { brandRepository } from "../repositories/brand.repository";
import { BadRequestError } from "../errors/error";
import { Paging } from "../dtos/other/paging.dto";
import { transactionRepository } from "../repositories/transaction.repository";
import { orderService } from "./order.service";
import { walletRepository } from "../repositories/wallet.reposirory";
import { payos } from "../utils/payos";
import { Account } from "../entities/account.entity";
import { bookingRepository } from "../repositories/booking.repository";
import { Booking } from "../entities/booking.entity";
import { Wallet } from "../entities/wallet.entity";
import { walletService } from "./wallet.service";
import { retrieveMasterConfig } from "../utils/retrieveMasterConfig";
import { accountRepository } from "../repositories/account.repository";
import { orderDetailRepository } from "../repositories/orderDetail.repository";

const repository = AppDataSource.getRepository(Transaction);
class TransactionService extends BaseService<Transaction> {
  async getFinancialSummary(loginUser: string) {
    const totalAmountFromWithDrawal =
      (
        await transactionRepository
          .createQueryBuilder("transaction")
          .select("SUM(transaction.amount)", "totalAmountFromWithDrawal")
          .where("transaction.type = :type", {
            type: TransactionTypeEnum.WITHDRAW,
          })
          .andWhere("transaction.buyer = :loginUser", { loginUser })
          .getRawOne()
      )?.totalAmountFromWithDrawal || 0;
    const totalAmountFromDeposit =
      (
        await transactionRepository
          .createQueryBuilder("transaction")
          .select("SUM(transaction.amount)", "totalAmountFromDeposit")
          .where("transaction.buyer = :loginUser", { loginUser })
          .andWhere("transaction.type = :type", {
            type: TransactionTypeEnum.DEPOSIT,
          })
          .getRawOne()
      )?.totalAmountFromDeposit || 0;
    const balance =
      (
        await walletRepository.findOne({
          where: { owner: { id: loginUser } },
        })
      )?.balance || 0;
    return {
      totalAmountFromDeposit,
      totalAmountFromWithDrawal,
      balance,
    };
  }
  async pay(payRequest: PayRequest) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (payRequest.type == PayTypeEnum.ORDER) {
        const order = await orderRepository.findOne({
          where: { id: payRequest.id },
          relations: {
            account: true,
            children: {
              account: true,
            },
          },
        });
        if (!order) throw new BadRequestError(`Order not found`);
        if (order.status != ShippingStatusEnum.TO_PAY) {
          throw new BadRequestError(`This order can not be paid`);
        }
        if (order.paymentMethod == PaymentMethodEnum.WALLET) {
          const wallet = await walletRepository.findOne({
            where: {
              owner: { id: order.account.id },
            },
          });
          if (!wallet) throw new BadRequestError(`Wallet not found`);
          if (wallet.availableBalance < order.totalPrice) {
            throw new BadRequestError(`Balance wallet not enough`);
          }
          const transactions = [];
          // Create transactions for child orders
          for (const childOrder of order.children) {
            walletService.decreaseBalance(wallet, childOrder.totalPrice);
            await queryRunner.manager.save(Wallet, wallet);

            const transaction = await this.createTransactionFromChildOrder(
              childOrder,
              TransactionTypeEnum.ORDER_PURCHASE,
              queryRunner
            );
            transactions.push(transaction);
          }
          await queryRunner.manager.save(Transaction, transactions);
        } else if (order.paymentMethod == PaymentMethodEnum.BANK_TRANSFER) {
          await this.getPaymentData(payRequest.orderId);
        } else {
          throw new BadRequestError(
            `Only pay for with wallet or bank transfer`
          );
        }
        const transactions = [];
        // Create transactions for child orders
        for (const childOrder of order.children) {
          const transaction = await this.createTransactionFromChildOrder(
            childOrder,
            TransactionTypeEnum.ORDER_PURCHASE,
            queryRunner
          );
          transactions.push(transaction);
        }
        await queryRunner.manager.save(Transaction, transactions);

        //update order status and save
        order.status = ShippingStatusEnum.WAIT_FOR_CONFIRMATION;
        await queryRunner.manager.save(Order, order);
        //create status tracking
        await orderService.createStatusTracking(
          order,
          order.account.id,
          ShippingStatusEnum.WAIT_FOR_CONFIRMATION,
          null,
          queryRunner
        );
        for (const childOrder of order.children) {
          childOrder.status = ShippingStatusEnum.WAIT_FOR_CONFIRMATION;
          await queryRunner.manager.save(Order, childOrder);

          await orderService.createStatusTracking(
            childOrder,
            childOrder.account.id,
            ShippingStatusEnum.WAIT_FOR_CONFIRMATION,
            null,
            queryRunner
          );
        }
      } else if (payRequest.type == PayTypeEnum.BOOKING) {
        const booking = await bookingRepository.findOne({
          where: { id: payRequest.id },
        });
        if (!booking) throw new BadRequestError(`Booking not found`);
        if (booking.status != BookingStatusEnum.TO_PAY) {
          throw new BadRequestError(`This booking can not be paid`);
        }
        if (booking.paymentMethod == PaymentMethodEnum.WALLET) {
          const wallet = await walletRepository.findOne({
            where: {
              owner: { id: booking.account.id },
            },
          });
          if (!wallet) throw new BadRequestError(`Wallet not found`);
          if (wallet.availableBalance < booking.totalPrice) {
            throw new BadRequestError(`Balance wallet not enough`);
          }
          walletService.decreaseBalance(wallet, booking.totalPrice);
          await queryRunner.manager.save(wallet);
        } else if (booking.paymentMethod == PaymentMethodEnum.BANK_TRANSFER) {
          await this.getPaymentData(payRequest.orderId);
        } else {
          throw new BadRequestError(
            `Only pay for with wallet or bank transfer`
          );
        }
        const transaction = await this.createTransactionFromBooking(
          booking,
          TransactionTypeEnum.BOOKING_PURCHASE,
          queryRunner
        );
        await queryRunner.manager.save(transaction);

        booking.status = BookingStatusEnum.WAIT_FOR_CONFIRMATION;
        await queryRunner.manager.save(Booking, booking);
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async deposit(orderId: string, loginUser: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const data = await this.getPaymentData(orderId);
      const wallet = await walletRepository.findOne({
        where: {
          owner: { id: loginUser },
        },
      });
      if (!wallet) throw new BadRequestError(`Wallet not found`);
      walletService.increaseBalance(wallet, data.amount);
      await queryRunner.manager.save(wallet);
      const transaction = transactionService.createTransactionFromDeposit(
        wallet.balance,
        data.amount,
        loginUser
      );
      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getPaymentData(orderId: string) {
    try {
      const data = await payos.getPaymentLinkInformation(orderId);
      if (data.status != "PAID") {
        throw new BadRequestError(`This transaction is not paid`);
      }
      return data;
    } catch (error) {
      throw new BadRequestError(`Invalid transaction code`);
    }
  }

  async filterForConsultant(
    filterTransactionRequest: FilterTransactionRequest,
    paging: Paging,
    loginUser: string
  ) {
    const limit = paging.limit;
    const offset = (paging.page - 1) * paging.limit;
    const total = await this.getTotalTransactionCountForConsultant(
      filterTransactionRequest,
      loginUser
    );

    const totalPages = Math.ceil(total / paging.limit);
    const query = this.getTransactionsQueryForConsultant(
      filterTransactionRequest,
      loginUser
    )
      .take(limit)
      .skip(offset);

    return {
      total,
      totalPages,
      items: await query.getMany(),
    };
  }

  async filterForBrand(
    filterTransactionRequest: FilterTransactionRequest,
    paging: Paging,
    brandId: string
  ) {
    const limit = paging.limit;
    const offset = (paging.page - 1) * paging.limit;
    const total = await this.getTotalTransactionCountForBrand(
      filterTransactionRequest,
      brandId
    );

    const totalPages = Math.ceil(total / paging.limit);
    const query = this.getTransactionsQueryForBrand(
      filterTransactionRequest,
      brandId
    )
      .take(limit)
      .skip(offset);

    return {
      total,
      totalPages,
      items: await query.getMany(),
    };
  }

  async filterForAdmin(
    filterTransactionRequest: FilterTransactionRequest,
    paging: Paging
  ) {
    const limit = paging.limit;
    const offset = (paging.page - 1) * paging.limit;
    const total = await this.getTotalTransactionCount(filterTransactionRequest);

    const totalPages = Math.ceil(total / paging.limit);
    const query = this.getTransactionsQuery(filterTransactionRequest)
      .take(limit)
      .skip(offset);

    return {
      total,
      totalPages,
      items: await query.getMany(),
    };
  }

  async filter(
    filterTransactionRequest: FilterTransactionRequest,
    loginUser: string,
    paging: Paging
  ) {
    const account = await accountRepository.findOne({
      where: {
        id: loginUser,
      },
      relations: {
        role: true,
      },
    });
    const limit = paging.limit;
    const offset = (paging.page - 1) * paging.limit;
    const { types, startDate, endDate } = filterTransactionRequest;

    const query = transactionRepository
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.buyer", "buyer")
      .leftJoinAndSelect("transaction.brand", "brand")
      .leftJoinAndSelect("transaction.order", "order")
      .leftJoinAndSelect("transaction.consultant", "consultant")
      .orderBy("transaction.createdAt", "DESC");
    orderService.queryBuilderForOrder(query);
    if (account.role.role == RoleEnum.CUSTOMER) {
      query.where("buyer.id = :loginUser", { loginUser });
    } else if (account.role.role == RoleEnum.MANAGER) {
      const brand = account.brands[0];
      query
        .where("brand.id = :brandId", { brandId: brand.id })
        .andWhere("transaction.type = :type", {
          type: TransactionTypeEnum.TRANSFER_TO_WALLET,
        });
    } else if (account.role.role == RoleEnum.CONSULTANT) {
      query.where(
        "(consultant.id = :loginUser AND transaction.type = :type) OR buyer.id = :loginUser",
        {
          loginUser,
          type: TransactionTypeEnum.TRANSFER_TO_WALLET,
        }
      );
    } else if (account.role.role == RoleEnum.ADMIN) {
    } else
      throw new BadRequestError(
        "You dont have permission to access this resource"
      );
    if (types && types.length > 0)
      query.andWhere("transaction.type IN (:...types)", { types });
    if (startDate && endDate)
      query.andWhere("transaction.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    const [items, total] = await query
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);

    return {
      total,
      totalPages,
      items,
    };
  }

  getTransactionsQueryForConsultant(
    filterTransactionRequest: FilterTransactionRequest,
    consultantId: string
  ) {
    const { startDate, endDate } = filterTransactionRequest;

    const query = transactionRepository
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.buyer", "buyer")
      .leftJoinAndSelect("transaction.consultant", "consultant")
      .leftJoinAndSelect("transaction.booking", "booking")
      .orderBy("transaction.createdAt", "DESC")
      .where("transaction.type = :type", {
        type: TransactionTypeEnum.TRANSFER_TO_WALLET,
      })
      .andWhere("consultant.id = :consultantId", { consultantId });
    if (startDate && endDate)
      query.andWhere("transaction.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    return query;
  }

  async getTotalTransactionCountForConsultant(
    filterTransactionRequest: FilterTransactionRequest,
    consultantId: string
  ) {
    const { startDate, endDate } = filterTransactionRequest;
    const query = transactionRepository
      .createQueryBuilder("transaction")
      .select("COUNT(*)", "total")
      .innerJoin("transaction.consultant", "consultant")
      .where("transaction.type = :type", {
        type: TransactionTypeEnum.TRANSFER_TO_WALLET,
      })
      .andWhere("consultant.id = :consultantId", { consultantId });
    if (startDate && endDate)
      query.andWhere("transaction.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    return (await query.getRawOne())?.total || 0;
  }

  getTransactionsQueryForBrand(
    filterTransactionRequest: FilterTransactionRequest,
    brandId: string
  ) {
    const { startDate, endDate } = filterTransactionRequest;

    const query = transactionRepository
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.buyer", "buyer")
      .leftJoinAndSelect("transaction.brand", "brand")
      .leftJoinAndSelect("transaction.order", "order")
      .orderBy("transaction.createdAt", "DESC")
      .where("transaction.type = :type", {
        type: TransactionTypeEnum.TRANSFER_TO_WALLET,
      })
      .andWhere("brand.id = :brandId", { brandId });
    orderService.queryBuilderForOrder(query);
    if (startDate && endDate)
      query.andWhere("transaction.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    return query;
  }

  async getTotalTransactionCountForBrand(
    filterTransactionRequest: FilterTransactionRequest,
    brandId: string
  ) {
    const { startDate, endDate } = filterTransactionRequest;
    const query = transactionRepository
      .createQueryBuilder("transaction")
      .select("COUNT(*)", "total")
      .innerJoin("transaction.brand", "brand")
      .where("transaction.type = :type", {
        type: TransactionTypeEnum.TRANSFER_TO_WALLET,
      })
      .andWhere("brand.id = :brandId", { brandId });
    if (startDate && endDate)
      query.andWhere("transaction.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    return (await query.getRawOne())?.total || 0;
  }

  getTransactionsQuery(
    filterTransactionRequest: FilterTransactionRequest,
    loginUser?: string
  ) {
    const { types, startDate, endDate } = filterTransactionRequest;

    const query = transactionRepository
      .createQueryBuilder("transaction")
      .leftJoinAndSelect("transaction.buyer", "buyer")
      .leftJoinAndSelect("transaction.brand", "brand")
      .leftJoinAndSelect("transaction.order", "order")
      .orderBy("transaction.createdAt", "DESC");
    orderService.queryBuilderForOrder(query);

    if (loginUser) {
      query.where("buyer.id = :loginUser", { loginUser });
    }
    if (types && types.length > 0)
      query.andWhere("transaction.type IN (:...types)", { types });
    if (startDate && endDate)
      query.andWhere("transaction.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    return query;
  }

  async getTotalTransactionCount(
    filterTransactionRequest: FilterTransactionRequest,
    loginUser?: string
  ) {
    const { types, startDate, endDate } = filterTransactionRequest;
    const query = transactionRepository
      .createQueryBuilder("transaction")
      .select("COUNT(*)", "total")
      .innerJoin("transaction.buyer", "buyer");
    if (loginUser) {
      query.where("buyer.id = :loginUser", { loginUser });
    }
    if (types && types.length > 0)
      query.andWhere("transaction.type IN (:...types)", { types });
    if (startDate && endDate)
      query.andWhere("transaction.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    return (await query.getRawOne())?.total || 0;
  }

  async getBrandRevenueStatistics(
    getBrandRevenueStatisticsRequest: GetStatisticsRequest,
    brandId: string
  ) {
    const brand = await brandRepository.findOne({
      where: { id: brandId },
    });
    if (!brand) throw new BadRequestError(`Brand not find`);
    let startDate = new Date(getBrandRevenueStatisticsRequest.startDate);
    let endDate = new Date(getBrandRevenueStatisticsRequest.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const queryBuilder = orderRepository
      .createQueryBuilder("o")
      .innerJoin("o.brand", "b")
      .select([
        "COALESCE(COUNT(o.id), 0) AS order_quantity",
        "COALESCE(SUM(o.totalPrice), 0) AS total",
        'COALESCE(SUM(o."subTotal"), 0) AS sub_total',
        'COALESCE(SUM(o."subTotal"- o.totalPrice), 0) AS discount',
      ])
      .where("b.id = :brandId", {
        brandId,
      })
      .andWhere("o.status IN (:...statuses) AND o.parent_id IS NOT NULL", {
        statuses: [
          ShippingStatusEnum.DELIVERED,
          ShippingStatusEnum.COMPLETED,
          ShippingStatusEnum.RETURNED_FAIL,
        ],
      })
      .groupBy("b.id");
    if (
      getBrandRevenueStatisticsRequest.type == StatisticsTimeEnum.SPECIFIC_TIME
    ) {
      let startDate = new Date(getBrandRevenueStatisticsRequest.startDate);
      let endDate = new Date(getBrandRevenueStatisticsRequest.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere("o.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    }
    const result = await queryBuilder.getRawOne();
    if (!result)
      return {
        orderQuantityCompleted: 0,
        total: 0,
        subTotal: 0,
        discount: 0,
      };

    return {
      orderQuantityCompleted: parseInt(result.order_quantity),
      total: result.total,
      subTotal: result.sub_total,
      discount: result.discount,
    };
  }
  async getUserSpendingStatistics(
    getUserSpendingStatisticsRequest: GetStatisticsRequest,
    loginUser: string
  ) {
    const queryBuilder = orderRepository
      .createQueryBuilder("o")
      .innerJoin("o.account", "a")
      .select([
        "COALESCE(COUNT(o.id), 0) AS order_quantity",
        "COALESCE(SUM(o.totalPrice), 0) AS total",
        'COALESCE(SUM(o."subTotal"), 0) AS sub_total',
        'COALESCE(SUM(o."subTotal"- o.totalPrice), 0) AS discount',
      ])
      .where("a.id = :loginUser", {
        loginUser,
      })
      .andWhere("o.status IN (:...statuses) AND o.parent_id IS NOT NULL", {
        statuses: [
          ShippingStatusEnum.DELIVERED,
          ShippingStatusEnum.COMPLETED,
          ShippingStatusEnum.RETURNED_FAIL,
        ],
      })
      .groupBy("a.id");
    if (
      getUserSpendingStatisticsRequest.type == StatisticsTimeEnum.SPECIFIC_TIME
    ) {
      let startDate = new Date(getUserSpendingStatisticsRequest.startDate);
      let endDate = new Date(getUserSpendingStatisticsRequest.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere("o.createdAt BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      });
    }
    const result = await queryBuilder.getRawOne();
    if (!result)
      return {
        orderQuantityCompleted: 0,
        total: 0,
        subTotal: 0,
        discount: 0,
      };
    return {
      orderQuantityCompleted: parseInt(result.order_quantity),
      total: result.total,
      subTotal: result.sub_total,
      discount: result.discount,
    };
  }

  async cancelTransactionBasedOnOrderId(
    orderId: string,
    queryRunner: QueryRunner
  ) {
    const transaction = await repository.findOne({
      where: { order: { id: orderId } },
    });
    if (!transaction) return;
    await queryRunner.manager.save(transaction);
  }

  createTransactionFromOrderGroupBuying(
    order: Order,
    groupBuying: GroupBuying
  ) {
    const transaction = new Transaction();
    transaction.order = order;
    transaction.buyer = order.account;
    transaction.amount = order.totalPrice;
    transaction.brand = groupBuying.groupProduct.brand;
    transaction.paymentMethod = PaymentMethodEnum.WALLET;
    transaction.type = TransactionTypeEnum.ORDER_PURCHASE;
    return transaction;
  }

  createTransactionFromDeposit(
    balance: number,
    amount: number,
    loginUser: string
  ) {
    const transaction = new Transaction();
    transaction.amount = amount;
    transaction.buyer = { id: loginUser } as Account;
    transaction.paymentMethod = PaymentMethodEnum.BANK_TRANSFER;
    transaction.type = TransactionTypeEnum.DEPOSIT;
    transaction.balanceAfterTransaction = balance;
    return transaction;
  }

  createTransactionFromWithDraw(
    amount: number,
    balance: number,
    loginUser: string
  ) {
    const transaction = new Transaction();
    transaction.amount = amount;
    transaction.buyer = { id: loginUser } as Account;
    transaction.paymentMethod = PaymentMethodEnum.WALLET;
    transaction.type = TransactionTypeEnum.WITHDRAW;
    transaction.balanceAfterTransaction = balance;
    return transaction;
  }

  async createTransactionForTransferToWalletFromOrder(
    balance: number,
    order: Order
  ) {
    const masterConfig = await retrieveMasterConfig();
    const transaction = new Transaction();
    transaction.order = order;
    transaction.amount = order.totalPrice * (1 - masterConfig.commissionFee);
    transaction.brand = order.brand;
    transaction.buyer = { id: order.account.id } as Account;
    transaction.paymentMethod = PaymentMethodEnum.WALLET;
    transaction.type = TransactionTypeEnum.TRANSFER_TO_WALLET;
    transaction.balanceAfterTransaction = balance;
    return transaction;
  }

  async createTransactionForTransferToWalletFromBooking(
    balance: number,
    booking: Booking
  ) {
    const masterConfig = await retrieveMasterConfig();
    const transaction = new Transaction();
    transaction.booking = booking;
    transaction.amount = booking.totalPrice * (1 - masterConfig.commissionFee);
    transaction.consultant = booking.consultantService.account;
    transaction.buyer = { id: booking.account.id } as Account;
    transaction.paymentMethod = PaymentMethodEnum.WALLET;
    transaction.type = TransactionTypeEnum.TRANSFER_TO_WALLET;
    transaction.balanceAfterTransaction = balance;
    return transaction;
  }

  async createTransactionFromChildOrder(
    childOrder: Order,
    type: TransactionTypeEnum,
    queryRunner?: QueryRunner
  ) {
    const transaction = new Transaction();
    transaction.order = childOrder;
    transaction.buyer = childOrder.account;
    transaction.amount = childOrder.totalPrice;
    transaction.brand = childOrder.brand;
    let wallet: Wallet;
    if (queryRunner) {
      wallet = await queryRunner.manager.findOne(Wallet, {
        where: {
          owner: { id: childOrder.account.id },
        },
      });
    } else {
      wallet = await walletRepository.findOne({
        where: {
          owner: { id: childOrder.account.id },
        },
      });
    }
    if (!wallet) throw new BadRequestError(`Wallet not found`);
    transaction.balanceAfterTransaction = wallet.balance;
    if (type) {
      switch (type) {
        case TransactionTypeEnum.ORDER_PURCHASE:
          transaction.type = TransactionTypeEnum.ORDER_PURCHASE;
          transaction.paymentMethod = childOrder.paymentMethod;
          transaction.balanceAfterTransaction = wallet.balance;
          break;
        case TransactionTypeEnum.ORDER_REFUND:
          transaction.type = TransactionTypeEnum.ORDER_REFUND;
          transaction.paymentMethod = PaymentMethodEnum.WALLET;
          transaction.balanceAfterTransaction = wallet.balance;
          break;
        case TransactionTypeEnum.ORDER_CANCEL:
          transaction.type = TransactionTypeEnum.ORDER_CANCEL;
          transaction.paymentMethod = PaymentMethodEnum.WALLET;
          transaction.balanceAfterTransaction = wallet.balance;
          break;
        default:
          throw new BadRequestError(`Invalid transaction type`);
      }
    }
    return transaction;
  }

  async transferToBrandWallet(orderId: string, queryRunner: QueryRunner) {
    const order = await queryRunner.manager.findOne(Order, {
      where: {
        id: orderId,
      },
      relations: {
        account: true,
        brand: {
          accounts: {
            role: true,
          },
        },
      },
    });
    const manager = order.brand.accounts.find(
      (account) => account.role.role == RoleEnum.MANAGER
    );
    if (!manager) throw new BadRequestError(`Brand manager not found`);

    const wallet = await queryRunner.manager.findOne(Wallet, {
      where: {
        owner: { id: manager.id },
      },
    });
    if (!wallet) throw new BadRequestError("Dont have wallet");
    const masterConfig = await retrieveMasterConfig();
    walletService.increaseBalance(
      wallet,
      order.totalPrice * (1 - masterConfig.commissionFee)
    );
    await queryRunner.manager.save(wallet);
    const transaction =
      await this.createTransactionForTransferToWalletFromOrder(
        wallet.balance,
        order
      );
    await queryRunner.manager.save(transaction);
  }

  async transferToConsultantWallet(
    bookingId: string,
    queryRunner: QueryRunner
  ) {
    const booking = await queryRunner.manager.findOne(Booking, {
      where: {
        id: bookingId,
      },
      relations: {
        account: true,
        consultantService: {
          account: true,
        },
      },
    });
    const consultant = booking.consultantService.account;

    const wallet = await queryRunner.manager.findOne(Wallet, {
      where: {
        owner: { id: consultant.id },
      },
    });
    if (!wallet) throw new BadRequestError("Dont have wallet");
    const masterConfig = await retrieveMasterConfig();
    walletService.increaseBalance(
      wallet,
      booking.totalPrice * (1 - masterConfig.commissionFee)
    );
    await queryRunner.manager.save(wallet);
    const transaction =
      await this.createTransactionForTransferToWalletFromBooking(
        wallet.balance,
        booking
      );
    await queryRunner.manager.save(transaction);
  }

  async createTransactionFromBooking(
    booking: Booking,
    type: TransactionTypeEnum,
    queryRunner?: QueryRunner
  ) {
    const transaction = new Transaction();
    transaction.booking = booking;
    transaction.buyer = booking.account;
    transaction.amount = booking.totalPrice;
    transaction.brand = booking.brand;
    let wallet: Wallet;
    if (queryRunner) {
      wallet = await queryRunner.manager.findOne(Wallet, {
        where: {
          owner: { id: booking.account.id },
        },
      });
    } else {
      wallet = await walletRepository.findOne({
        where: {
          owner: { id: booking.account.id },
        },
      });
    }
    if (!wallet) throw new BadRequestError(`Wallet not found`);
    transaction.balanceAfterTransaction = wallet.balance;

    if (type) {
      switch (type) {
        case TransactionTypeEnum.BOOKING_PURCHASE:
          transaction.type = TransactionTypeEnum.BOOKING_PURCHASE;
          transaction.paymentMethod = booking.paymentMethod;
          transaction.balanceAfterTransaction = wallet.balance;
          if (transaction.balanceAfterTransaction < 0) {
            throw new BadRequestError(`Balance wallet not enough`);
          }
          break;
        case TransactionTypeEnum.BOOKING_REFUND:
          transaction.type = TransactionTypeEnum.BOOKING_REFUND;
          transaction.paymentMethod = PaymentMethodEnum.WALLET;
          transaction.balanceAfterTransaction = wallet.balance;
          break;
        case TransactionTypeEnum.BOOKING_CANCEL:
          transaction.type = TransactionTypeEnum.BOOKING_CANCEL;
          transaction.paymentMethod = PaymentMethodEnum.WALLET;
          transaction.balanceAfterTransaction = wallet.balance;
          break;
        default:
          throw new BadRequestError(`Invalid transaction type`);
      }
    }
    return transaction;
  }

  async getDailyOrderStatistics(
    getDailyOrderStatisticsRequest: GetDailyOrderStatisticsRequest
  ) {
    const { productIds, orderType, brandId } = getDailyOrderStatisticsRequest;
    if (
      !getDailyOrderStatisticsRequest.startDate ||
      !getDailyOrderStatisticsRequest.endDate
    ) {
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      getDailyOrderStatisticsRequest.startDate = oneMonthAgo;
      getDailyOrderStatisticsRequest.endDate = today;
    }
    const { startDate, endDate } = getDailyOrderStatisticsRequest;

    const queryBuilder = orderDetailRepository
      .createQueryBuilder("orderDetail")
      .leftJoinAndSelect("orderDetail.order", "order")
      .innerJoin(
        "order.statusTrackings",
        "statusTracking",
        "statusTracking.status = :status AND statusTracking.createdAt BETWEEN :startDate AND :endDate",
        { status: ShippingStatusEnum.WAIT_FOR_CONFIRMATION, startDate, endDate }
      )
      .leftJoinAndSelect("order.account", "account")
      .leftJoinAndSelect("order.groupBuying", "groupBuying")
      .leftJoinAndSelect("groupBuying.groupProduct", "groupProduct")
      .leftJoinAndSelect(
        "orderDetail.productClassification",
        "productClassification"
      )
      .leftJoinAndSelect("productClassification.product", "product")
      .leftJoinAndSelect(
        "productClassification.productDiscount",
        "productDiscount"
      )
      .leftJoinAndSelect("productDiscount.product", "discountProduct")
      .leftJoinAndSelect(
        "productClassification.preOrderProduct",
        "preOrderProduct"
      )
      .leftJoinAndSelect("preOrderProduct.product", "preOrderProductItem")
      .select([
        "DATE_TRUNC('day', statusTracking.createdAt) as date",
        "SUM(orderDetail.totalPrice) as totalRevenue",
        "SUM(orderDetail.quantity) as totalQuantity",
        "SUM(orderDetail.platformVoucherDiscount) as totalPlatformVoucherDiscount",
        "SUM(orderDetail.shopVoucherDiscount) as totalShopVoucherDiscount",
      ])
      .where("order.parent_id IS NOT NULL")
      .andWhere("order.status != :cancelledStatus", {
        cancelledStatus: ShippingStatusEnum.CANCELLED,
      })
      .groupBy("DATE_TRUNC('day', statusTracking.createdAt)")
      .orderBy("date", "DESC");
    if (brandId) {
      queryBuilder.andWhere(
        "(order.brand_id = :brandId OR groupProduct.brand_id = :brandId)",
        {
          brandId,
        }
      );
    }
    if (orderType) {
      if (!productIds || productIds.length == 0) {
        throw new BadRequestError("Product ids are required");
      }
      if (orderType == OrderEnum.PRE_ORDER) {
        queryBuilder.andWhere(
          "orderDetail.type = :type AND preOrderProduct.id IN (:...productIds)",
          { type: OrderEnum.PRE_ORDER, productIds }
        );
      } else if (orderType == OrderEnum.FLASH_SALE) {
        queryBuilder.andWhere(
          "orderDetail.type = :type AND productDiscount.id IN (:...productIds)",
          {
            type: OrderEnum.FLASH_SALE,
            productIds,
          }
        );
      } else if (orderType == OrderEnum.NORMAL) {
        queryBuilder.andWhere(
          "(product.id IN (:...productIds) OR discountProduct.id IN (:...productIds) OR preOrderProductItem.id IN (:...productIds))",
          {
            productIds,
          }
        );
      }
    }

    const results = await queryBuilder.getRawMany();
    const dateRange = this.generateDateRange(startDate, endDate);

    const statistics = dateRange.map((date) => {
      const result = results.find(
        (r) => r.date.toISOString().split("T")[0] == date
      );
      return {
        date,
        totalRevenue: result ? parseFloat(result.totalrevenue) : 0,
        totalQuantity: result ? parseInt(result.totalquantity) : 0,
        totalPlatformVoucherDiscount: result
          ? parseFloat(result.totalplatformvoucherdiscount)
          : 0,
        totalShopVoucherDiscount: result
          ? parseFloat(result.totalshopvoucherdiscount)
          : 0,
      };
    });

    const total = statistics.reduce(
      (acc, curr) => {
        acc.totalRevenue += curr.totalRevenue;
        acc.totalQuantity += curr.totalQuantity;
        acc.totalPlatformVoucherDiscount += curr.totalPlatformVoucherDiscount;
        acc.totalShopVoucherDiscount += curr.totalShopVoucherDiscount;
        return acc;
      },
      {
        totalRevenue: 0,
        totalQuantity: 0,
        totalPlatformVoucherDiscount: 0,
        totalShopVoucherDiscount: 0,
      }
    );

    return {
      total,
      items: statistics,
    };
  }

  generateDateRange(startDate: Date, endDate: Date): string[] {
    const dates = [];
    let currentDate = new Date(startDate);
    const end = new Date(endDate);

    while (currentDate <= end) {
      dates.push(currentDate.toISOString().split("T")[0]); // Chỉ lấy phần ngày (yyyy-mm-dd)
      currentDate.setDate(currentDate.getDate() + 1); // Tăng thêm một ngày
    }
    return dates;
  }

  constructor() {
    super(repository);
  }
}

export const transactionService = new TransactionService();
