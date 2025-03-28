import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { Transaction } from '../entities/transaction.entity';
import {
  BookingStatusEnum,
  PaymentMethodEnum,
  PayTypeEnum,
  ShippingStatusEnum,
  StatisticsTimeEnum,
  TransactionTypeEnum,
} from '../utils/enum';
import { BaseService } from './base.service';
import { Order } from '../entities/order.entity';
import { GroupBuying } from '../entities/groupBuying.entity';
import {
  FilterTransactionRequest,
  GetStatisticsRequest,
  PayRequest,
} from '../dtos/request/transaction.request';
import { orderRepository } from '../repositories/order.repository';
import { brandRepository } from '../repositories/brand.repository';
import { BadRequestError } from '../errors/error';
import { Paging } from '../dtos/other/paging.dto';
import { transactionRepository } from '../repositories/transaction.repository';
import { orderService } from './order.service';
import { walletRepository } from '../repositories/wallet.reposirory';
import { payos } from '../utils/payos';
import { Account } from '../entities/account.entity';
import { bookingRepository } from '../repositories/booking.repository';
import { Booking } from '../entities/booking.entity';

const repository = AppDataSource.getRepository(Transaction);
class TransactionService extends BaseService<Transaction> {
  async pay(payRequest: PayRequest) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      if (payRequest.type == PayTypeEnum.ORDER) {
        const order = await orderRepository.findOne({
          where: { id: payRequest.orderId },
          relations: {
            account: true,
          },
        });
        if (!order) throw new BadRequestError(`Order not found`);
        if (order.status != ShippingStatusEnum.TO_PAY) {
          throw new BadRequestError(`This order has been paid`);
        }
        if (order.paymentMethod == PaymentMethodEnum.WALLET) {
          const wallet = await walletRepository.findOne({
            where: {
              owner: { id: order.account.id },
            },
          });
          if (!wallet) throw new BadRequestError(`Wallet not found`);
          if (wallet.balance < order.totalPrice) {
            throw new BadRequestError(`Balance wallet not enough`);
          }
          wallet.balance -= order.totalPrice;
          await queryRunner.manager.save(wallet);
        } else if (order.paymentMethod == PaymentMethodEnum.BANK_TRANSFER) {
          const data = await this.getPaymentData(payRequest.orderId);
        } else {
          throw new BadRequestError(
            `Only pay for with wallet or bank transfer`
          );
        }
        const transaction = await this.createTransactionFromChildOrder(
          order,
          TransactionTypeEnum.ORDER_PURCHASE
        );
        await queryRunner.manager.save(transaction);
      } else if (payRequest.type == PayTypeEnum.BOOKING) {
        const booking = await bookingRepository.findOne({
          where: { id: payRequest.id },
        });
        if (!booking) throw new BadRequestError(`Booking not found`);
        if (booking.status != BookingStatusEnum.TO_PAY) {
          throw new BadRequestError(`This booking has been paid`);
        }
        if (booking.paymentMethod == PaymentMethodEnum.WALLET) {
          const wallet = await walletRepository.findOne({
            where: {
              owner: { id: booking.account.id },
            },
          });
          if (!wallet) throw new BadRequestError(`Wallet not found`);
          if (wallet.balance < booking.totalPrice) {
            throw new BadRequestError(`Balance wallet not enough`);
          }
          wallet.balance -= booking.totalPrice;
          await queryRunner.manager.save(wallet);
        } else if (booking.paymentMethod == PaymentMethodEnum.BANK_TRANSFER) {
          const data = await this.getPaymentData(payRequest.orderId);
        } else {
          throw new BadRequestError(
            `Only pay for with wallet or bank transfer`
          );
        }
        const transaction = await this.createTransactionFromBooking(
          booking,
          TransactionTypeEnum.BOOKING_PURCHASE
        );
        await queryRunner.manager.save(transaction);
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
      wallet.balance += data.amount;
      await queryRunner.manager.save(wallet);
      const transaction = await transactionService.createTransactionFromDeposit(
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
      if (data.status != 'PAID') {
        throw new BadRequestError(`This transaction is not paid`);
      }
      return data;
    } catch (error) {
      throw new BadRequestError(`Invalid transaction code`);
    }
  }

  async filter(
    filterTransactionRequest: FilterTransactionRequest,
    loginUser: string,
    paging: Paging
  ) {
    const limit = paging.limit;
    const offset = (paging.page - 1) * paging.limit;
    const total = await this.getTotalTransactionCount(
      loginUser,
      filterTransactionRequest
    );

    const totalPages = Math.ceil(total / paging.limit);
    const query = this.getTransactionsQuery(loginUser, filterTransactionRequest)
      .take(limit)
      .skip(offset);

    return {
      total,
      totalPages,
      items: await query.getMany(),
    };
  }

  getTransactionsQuery(
    loginUser: string,
    filterTransactionRequest: FilterTransactionRequest
  ) {
    const { types, startDate, endDate } = filterTransactionRequest;

    const query = transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.buyer', 'buyer')
      .leftJoinAndSelect('transaction.brand', 'brand')
      .leftJoinAndSelect('transaction.order', 'order')
      .where('buyer.id = :loginUser', { loginUser })
      .orderBy('transaction.createdAt', 'DESC');
    orderService.queryBuilderForOrder(query);

    if (types && types.length > 0)
      query.andWhere('transaction.type IN (:...types)', { types });
    if (startDate && endDate)
      query.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    return query;
  }

  async getTotalTransactionCount(
    loginUser: string,
    filterTransactionRequest: FilterTransactionRequest
  ) {
    const { types, startDate, endDate } = filterTransactionRequest;
    const query = transactionRepository
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'total')
      .innerJoin('transaction.buyer', 'buyer')
      .where('buyer.id = :loginUser', { loginUser });
    if (types && types.length > 0)
      query.andWhere('transaction.type IN (:...types)', { types });
    if (startDate && endDate)
      query.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
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
      .createQueryBuilder('o')
      .innerJoin('o.brand', 'b')
      .select([
        'COALESCE(COUNT(o.id), 0) AS order_quantity',
        'COALESCE(SUM(o.totalPrice), 0) AS total',
        'COALESCE(SUM(o."subTotal"), 0) AS sub_total',
        'COALESCE(SUM(o."subTotal"- o.totalPrice), 0) AS discount',
      ])
      .where('b.id = :brandId', {
        brandId,
      })
      .andWhere(
        'o.status NOT IN (:...excludedStatuses) AND o.parent_id IS NOT NULL',
        {
          excludedStatuses: [
            ShippingStatusEnum.CANCELLED,
            ShippingStatusEnum.TO_PAY,
            ShippingStatusEnum.JOIN_GROUP_BUYING,
          ],
        }
      )
      .groupBy('b.id');
    if (
      getBrandRevenueStatisticsRequest.type == StatisticsTimeEnum.SPECIFIC_TIME
    ) {
      let startDate = new Date(getBrandRevenueStatisticsRequest.startDate);
      let endDate = new Date(getBrandRevenueStatisticsRequest.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('o.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }
    const result = await queryBuilder.getRawOne();
    if (!result)
      return {
        order_quantity: 0,
        total: 0,
        subTotal: 0,
        discount: 0,
      };

    return {
      orderQuantity: result.order_quantity,
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
      .createQueryBuilder('o')
      .innerJoin('o.account', 'a')
      .select([
        'COALESCE(SUM(o.totalPrice), 0) AS total',
        'COALESCE(SUM(o."subTotal"), 0) AS sub_total',
        'COALESCE(SUM(o."subTotal"- o.totalPrice), 0) AS discount',
      ])
      .where('a.id = :loginUser', {
        loginUser,
      })
      .andWhere(
        'o.status NOT IN (:...excludedStatuses) AND o.parent_id IS NOT NULL',
        {
          excludedStatuses: [
            ShippingStatusEnum.CANCELLED,
            ShippingStatusEnum.TO_PAY,
            ShippingStatusEnum.JOIN_GROUP_BUYING,
          ],
        }
      )
      .groupBy('a.id');
    if (
      getUserSpendingStatisticsRequest.type == StatisticsTimeEnum.SPECIFIC_TIME
    ) {
      let startDate = new Date(getUserSpendingStatisticsRequest.startDate);
      let endDate = new Date(getUserSpendingStatisticsRequest.endDate);
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('o.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      });
    }
    const result = await queryBuilder.getRawOne();
    if (!result)
      return {
        total: 0,
        subTotal: 0,
        discount: 0,
      };
    return {
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

  async createTransactionFromDeposit(amount: number, loginUser: string) {
    const transaction = new Transaction();
    transaction.amount = amount;
    transaction.buyer = { id: loginUser } as Account;
    transaction.paymentMethod = PaymentMethodEnum.BANK_TRANSFER;
    transaction.type = TransactionTypeEnum.DEPOSIT;

    const wallet = await walletRepository.findOne({
      where: {
        owner: { id: loginUser },
      },
    });
    if (!wallet) throw new BadRequestError(`Wallet not found`);
    transaction.balanceAfterTransaction = wallet.balance + amount;
    return transaction;
  }

  async createTransactionFromChildOrder(
    childOrder: Order,
    type: TransactionTypeEnum
  ) {
    const transaction = new Transaction();
    transaction.order = childOrder;
    transaction.buyer = childOrder.account;
    transaction.amount = childOrder.totalPrice;
    transaction.brand = childOrder.brand;

    const wallet = await walletRepository.findOne({
      where: {
        owner: { id: childOrder.account.id },
      },
    });
    if (!wallet) throw new BadRequestError(`Wallet not found`);
    transaction.balanceAfterTransaction = wallet.balance;
    if (type) {
      switch (type) {
        case TransactionTypeEnum.ORDER_PURCHASE:
          transaction.type = TransactionTypeEnum.ORDER_PURCHASE;
          transaction.paymentMethod = childOrder.paymentMethod;
          transaction.balanceAfterTransaction = wallet.balance;
          if (transaction.balanceAfterTransaction < 0) {
            throw new BadRequestError(`Balance wallet not enough`);
          }
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

  async createTransactionFromBooking(
    booking: Booking,
    type: TransactionTypeEnum
  ) {
    const transaction = new Transaction();
    transaction.booking = booking;
    transaction.buyer = booking.account;
    transaction.amount = booking.totalPrice;
    transaction.brand = booking.brand;

    const wallet = await walletRepository.findOne({
      where: {
        owner: { id: booking.account.id },
      },
    });
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

  constructor() {
    super(repository);
  }
}

export const transactionService = new TransactionService();
