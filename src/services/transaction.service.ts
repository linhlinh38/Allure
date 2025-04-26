import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { Transaction } from '../entities/transaction.entity';
import {
  BookingStatusEnum,
  OrderEnum,
  PaymentMethodEnum,
  PayTypeEnum,
  RoleEnum,
  ShippingStatusEnum,
  StatisticsTimeEnum,
  TransactionTypeEnum,
  BookingTypeEnum,
} from '../utils/enum';
import { BaseService } from './base.service';
import { Order } from '../entities/order.entity';
import { GroupBuying } from '../entities/groupBuying.entity';
import {
  FilterTransactionRequest,
  GetDailyBookingStatisticsRequest,
  GetDailyOrderStatisticsRequest,
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
import { Wallet } from '../entities/wallet.entity';
import { walletService } from './wallet.service';
import { accountRepository } from '../repositories/account.repository';
import { orderDetailRepository } from '../repositories/orderDetail.repository';

const repository = AppDataSource.getRepository(Transaction);
class TransactionService extends BaseService<Transaction> {
  async getDailyBookingStatistics(
    getDailyBookingStatisticsRequest: GetDailyBookingStatisticsRequest,
    loginUser: string
  ) {
    const account = await accountRepository.findOne({
      where: { id: loginUser },
      relations: { role: true },
    });
    if (
      !getDailyBookingStatisticsRequest.startDate ||
      !getDailyBookingStatisticsRequest.endDate
    ) {
      const today = new Date();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(today.getMonth() - 1);
      getDailyBookingStatisticsRequest.startDate = oneMonthAgo;
      getDailyBookingStatisticsRequest.endDate = today;
    } else {
      const { startDate, endDate } = getDailyBookingStatisticsRequest;
      getDailyBookingStatisticsRequest.startDate = new Date(startDate);
      getDailyBookingStatisticsRequest.endDate = new Date(endDate);
    }
    const { startDate, endDate, consultantId } =
      getDailyBookingStatisticsRequest;

    const queryBuilder = bookingRepository
      .createQueryBuilder('booking')
      .innerJoin(
        'booking.statusTrackings',
        'statusTracking',
        'statusTracking.status = :status AND statusTracking.createdAt BETWEEN :startDate AND :endDate',
        { status: BookingStatusEnum.WAIT_FOR_CONFIRMATION, startDate, endDate }
      )
      .innerJoin('booking.consultantService', 'consultantService')
      .where('booking.type = :type', { type: BookingTypeEnum.SERVICE });
    if (account && account.role.role == RoleEnum.CONSULTANT) {
      queryBuilder.andWhere('consultantService.account_id = :loginUser', {
        loginUser,
      });
    } else if (consultantId) {
      queryBuilder.andWhere('consultantService.account_id = :consultantId', {
        consultantId,
      });
    }

    const results = await queryBuilder
      .select([
        "DATE_TRUNC('day', statusTracking.createdAt) as date",
        'COUNT(CASE WHEN booking.status = :refundedStatus THEN 1 END) as refundedCount',
        'COUNT(CASE WHEN booking.status != :refundedStatus THEN 1 END) as bookedCount',
        'SUM(CASE WHEN booking.status = :refundedStatus THEN booking.totalPrice ELSE 0 END) as refundedTotalPrice',
        'SUM(CASE WHEN booking.status = :refundedStatus THEN booking.commissionFee ELSE 0 END) as refundedCommissionFee',
        'SUM(CASE WHEN booking.status = :refundedStatus THEN booking.totalPrice - booking.commissionFee ELSE 0 END) as refundedActualRevenue',
        'SUM(CASE WHEN booking.status != :refundedStatus THEN booking.totalPrice ELSE 0 END) as bookedTotalPrice',
        'SUM(CASE WHEN booking.status != :refundedStatus THEN booking.commissionFee ELSE 0 END) as bookedCommissionFee',
        'SUM(CASE WHEN booking.status != :refundedStatus THEN booking.totalPrice - booking.commissionFee ELSE 0 END) as bookedActualRevenue',
      ])
      .setParameter('refundedStatus', BookingStatusEnum.REFUNDED)
      .groupBy("DATE_TRUNC('day', statusTracking.createdAt)")
      .orderBy('date', 'DESC')
      .getRawMany();

    const dateRange = this.generateDateRange(startDate, endDate);

    const dailyStatistics = dateRange.map((date) => {
      const result = results.find(
        (r) => r.date.toISOString().split('T')[0] === date
      );
      return {
        date,
        refunded: {
          count: parseInt(result?.refundedcount || '0'),
          totalPrice: parseFloat(result?.refundedtotalprice || '0'),
          commissionFee: parseFloat(result?.refundedcommissionfee || '0'),
          actualRevenue: parseFloat(result?.refundedactualrevenue || '0'),
        },
        booked: {
          count: parseInt(result?.bookedcount || '0'),
          totalPrice: parseFloat(result?.bookedtotalprice || '0'),
          commissionFee: parseFloat(result?.bookedcommissionfee || '0'),
          actualRevenue: parseFloat(result?.bookedactualrevenue || '0'),
        },
      };
    });

    const total = results.reduce(
      (acc, curr) => {
        acc.refunded.count += parseInt(curr.refundedcount || '0');
        acc.refunded.totalPrice += parseFloat(curr.refundedtotalprice || '0');
        acc.refunded.commissionFee += parseFloat(
          curr.refundedcommissionfee || '0'
        );
        acc.refunded.actualRevenue += parseFloat(
          curr.refundedactualrevenue || '0'
        );
        acc.booked.count += parseInt(curr.bookedcount || '0');
        acc.booked.totalPrice += parseFloat(curr.bookedtotalprice || '0');
        acc.booked.commissionFee += parseFloat(curr.bookedcommissionfee || '0');
        acc.booked.actualRevenue += parseFloat(curr.bookedactualrevenue || '0');
        return acc;
      },
      {
        refunded: {
          count: 0,
          totalPrice: 0,
          commissionFee: 0,
          actualRevenue: 0,
        },
        booked: {
          count: 0,
          totalPrice: 0,
          commissionFee: 0,
          actualRevenue: 0,
        },
      }
    );

    return {
      total,
      items: dailyStatistics,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }
  async getOrderStatistics(brandId: string) {
    let cancelledOrders,
      refundedOrders,
      inProgressReturnedOrders,
      completedOrders,
      unpaidForBrandOrders;
    cancelledOrders = await this.queryCountOrderAndSumTotalPrice(
      [ShippingStatusEnum.CANCELLED],
      brandId
    ).getRawOne();
    refundedOrders = await this.queryCountOrderAndSumTotalPrice(
      [ShippingStatusEnum.REFUNDED],
      brandId
    ).getRawOne();
    inProgressReturnedOrders = await this.queryCountOrderAndSumTotalPrice(
      [ShippingStatusEnum.RETURNING, ShippingStatusEnum.BRAND_RECEIVED],
      brandId
    ).getRawOne();
    completedOrders = await this.queryCountOrderAndSumTotalPrice(
      [
        ShippingStatusEnum.DELIVERED,
        ShippingStatusEnum.COMPLETED,
        ShippingStatusEnum.RETURNED_FAIL,
      ],
      brandId,
      true
    ).getRawOne();
    unpaidForBrandOrders = await this.queryCountOrderAndSumTotalPrice(
      [
        ShippingStatusEnum.WAIT_FOR_CONFIRMATION,
        ShippingStatusEnum.PREPARING_ORDER,
        ShippingStatusEnum.SHIPPING,
        ShippingStatusEnum.TO_SHIP,
        ShippingStatusEnum.DELIVERED,
        ShippingStatusEnum.COMPLETED,
      ],
      brandId,
      false
    ).getRawOne();
    return {
      cancelledOrders: {
        count: parseInt(cancelledOrders?.count || '0'),
        sumTotalPrice: parseFloat(cancelledOrders?.sumtotalprice || '0'),
      },
      refundedOrders: {
        count: parseInt(refundedOrders?.count || '0'),
        sumTotalPrice: parseFloat(refundedOrders?.sumtotalprice || '0'),
      },
      inProgressReturnedOrders: {
        count: parseInt(inProgressReturnedOrders?.count || '0'),
        sumTotalPrice: parseFloat(
          inProgressReturnedOrders?.sumtotalprice || '0'
        ),
      },
      completedOrders: {
        count: parseInt(completedOrders?.count || '0'),
        sumTotalPrice: parseFloat(completedOrders?.sumtotalprice || '0'),
      },
      unpaidForBrandOrders: {
        count: parseInt(unpaidForBrandOrders?.count || '0'),
        sumTotalPrice: parseFloat(unpaidForBrandOrders?.sumtotalprice || '0'),
      },
    };
  }

  queryCountOrderAndSumTotalPrice(
    statuses: ShippingStatusEnum[],
    brandId?: string,
    isPaidForBrand: boolean = null
  ) {
    const query = orderRepository
      .createQueryBuilder('order')
      .select([
        'COUNT(order.id) as count',
        'SUM(order.totalPrice) as sumTotalPrice',
      ])
      .andWhere('order.parent_id IS NOT NULL')
      .andWhere('order.status IN (:...statuses)', {
        statuses,
      });
    if (brandId) {
      query.andWhere('order.brand_id = :brandId', { brandId });
    }
    if (isPaidForBrand != null) {
      query.andWhere('order.isPaidForBrand = :isPaidForBrand', {
        isPaidForBrand,
      });
    }
    return query;
  }

  async generalRevenueOrderBooking(
    startDate: Date,
    endDate: Date,
    loginUser: string
  ) {
    if (!startDate || !endDate) {
      startDate = new Date();
      endDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
    }
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    startDate.setHours(-7, 0, 0, 0);
    endDate.setHours(16, 59, 59, 999);

    // Calculate from transactions
    const result = await transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.order', 'order')
      .leftJoinAndSelect('transaction.booking', 'booking')
      .select([
        'SUM(CASE WHEN transaction.order IS NOT NULL THEN order.totalPrice ELSE 0 END) as totalOrderPrice',
        'SUM(CASE WHEN transaction.order IS NOT NULL THEN order.commissionFee ELSE 0 END) as totalOrderCommissionFee',
        'SUM(CASE WHEN transaction.booking IS NOT NULL THEN booking.totalPrice ELSE 0 END) as totalBookingPrice',
        'SUM(CASE WHEN transaction.booking IS NOT NULL THEN booking.commissionFee ELSE 0 END) as totalBookingCommissionFee',
      ])
      .where('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .andWhere('transaction.type = ')
      .getRawOne();

    const totalPrice =
      parseFloat(result?.totalorderprice || '0') +
      parseFloat(result?.totalbookingprice || '0');
    const totalCommissionFee =
      parseFloat(result?.totalordercommissionfee || '0') +
      parseFloat(result?.totalbookingcommissionfee || '0');

    return {
      totalPrice,
      totalCommissionFee,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  async consultantRevenue(
    startDate: Date,
    endDate: Date,
    consultantId: string,
    loginUser: string
  ) {
    if (!startDate || !endDate) {
      startDate = new Date();
      endDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
    }
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    startDate.setHours(-7, 0, 0, 0);
    endDate.setHours(16, 59, 59, 999);
    const account = await accountRepository.findOne({
      where: { id: loginUser },
      relations: { role: true },
    });
    if (account.role.role == RoleEnum.CONSULTANT) {
      return await this.calculateConsultantWalletTransfers(
        loginUser,
        startDate,
        endDate
      );
    }
    return await this.calculateConsultantWalletTransfers(
      consultantId,
      startDate,
      endDate
    );
  }

  async brandRevenue(startDate: Date, endDate: Date, brandId: string) {
    if (!startDate || !endDate) {
      startDate = new Date();
      endDate = new Date();
      startDate.setMonth(endDate.getMonth() - 1);
    }
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    startDate.setHours(-7, 0, 0, 0);
    endDate.setHours(16, 59, 59, 999);
    return await this.calculateBrandWalletTransfers(
      brandId,
      startDate,
      endDate
    );
  }
  async getFinancialSummary(loginUser: string) {
    const totalAmountFromWithDrawal =
      (
        await transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'totalAmountFromWithDrawal')
          .where('transaction.type = :type', {
            type: TransactionTypeEnum.WITHDRAW,
          })
          .andWhere('transaction.buyer = :loginUser', { loginUser })
          .getRawOne()
      )?.totalAmountFromWithDrawal || 0;
    const totalAmountFromDeposit =
      (
        await transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'totalAmountFromDeposit')
          .where('transaction.buyer = :loginUser', { loginUser })
          .andWhere('transaction.type = :type', {
            type: TransactionTypeEnum.DEPOSIT,
          })
          .getRawOne()
      )?.totalAmountFromDeposit || 0;
    const wallet = await walletRepository.findOne({
      where: { owner: { id: loginUser } },
    });
    const balance = wallet?.balance || 0;
    const availableBalance = wallet?.availableBalance || 0;
    return {
      totalAmountFromDeposit,
      totalAmountFromWithDrawal,
      balance,
      availableBalance
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
          const transactions = [];
          for (const childOrder of order.children) {
            const transaction = await this.createTransactionFromChildOrder(
              childOrder,
              TransactionTypeEnum.ORDER_PURCHASE,
              queryRunner
            );
            transactions.push(transaction);
          }
          await queryRunner.manager.save(Transaction, transactions);
        } else {
          throw new BadRequestError(
            `Only pay for with wallet or bank transfer`
          );
        }
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
      if (data.status != 'PAID') {
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

  async getAll(loginUser: string) {
    const account = await accountRepository.findOne({
      where: {
        id: loginUser,
      },
      relations: {
        role: true,
      },
    });
    const query = transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.buyer', 'buyer')
      .leftJoinAndSelect('transaction.brand', 'brand')
      .leftJoinAndSelect('transaction.order', 'order')
      .leftJoinAndSelect('transaction.consultant', 'consultant')
      .orderBy('transaction.createdAt', 'DESC');
    // orderService.queryBuilderForOrder(query);
    if (account.role.role == RoleEnum.CUSTOMER) {
      query.where('buyer.id = :loginUser', { loginUser });
    } else if (
      account.role.role == RoleEnum.MANAGER ||
      account.role.role == RoleEnum.STAFF
    ) {
      const brand = account.brands[0];
      query
        .where('brand.id = :brandId', { brandId: brand.id })
        .andWhere('transaction.type = :type', {
          type: TransactionTypeEnum.TRANSFER_TO_WALLET,
        });
    } else if (account.role.role == RoleEnum.CONSULTANT) {
      query.where(
        '(consultant.id = :loginUser AND transaction.type = :type) OR buyer.id = :loginUser',
        {
          loginUser,
          type: TransactionTypeEnum.TRANSFER_TO_WALLET,
        }
      );
    } else if (account.role.role == RoleEnum.ADMIN) {
    } else
      throw new BadRequestError(
        'You dont have permission to access this resource'
      );
    return await query.getMany();
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
        brands: true
      },
    });
    const limit = paging.limit;
    const offset = (paging.page - 1) * paging.limit;
    const { types, startDate, endDate, accountId } = filterTransactionRequest;

    const query = transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.buyer', 'buyer')
      .leftJoinAndSelect('transaction.brand', 'brand')
      .leftJoinAndSelect('transaction.order', 'order')
      .leftJoinAndSelect('transaction.consultant', 'consultant')
      .orderBy('transaction.createdAt', 'DESC');
    orderService.queryBuilderForOrder(query);
    if (account.role.role == RoleEnum.CUSTOMER) {
      query.where('buyer.id = :loginUser', { loginUser });
      query.andWhere('transaction.type != :type', {
          type: TransactionTypeEnum.TRANSFER_TO_WALLET,
        });
    } else if (
      account.role.role == RoleEnum.MANAGER ||
      account.role.role == RoleEnum.STAFF
    ) {
      const brand = account.brands[0];
      query
        .where(
          '((brand.id = :brandId AND transaction.type = :type) OR (buyer.id = :loginUser AND transaction.type != :type))',
          {
            brandId: brand.id,
            type: TransactionTypeEnum.TRANSFER_TO_WALLET,
            loginUser
          }
        )
        // .andWhere('transaction.type = :type', {
        //   type: TransactionTypeEnum.TRANSFER_TO_WALLET,
        // });
    } else if (account.role.role == RoleEnum.CONSULTANT) {
      query.where(
        '(consultant.id = :loginUser AND transaction.type = :type) OR buyer.id = :loginUser',
        {
          loginUser,
          type: TransactionTypeEnum.TRANSFER_TO_WALLET,
        }
      );
    } else if (account.role.role == RoleEnum.ADMIN) {
    } else
      throw new BadRequestError(
        'You dont have permission to access this resource'
      );
    if (types && types.length > 0)
      query.andWhere('transaction.type IN (:...types)', { types });
    if (startDate && endDate)
      query.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
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
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.buyer', 'buyer')
      .leftJoinAndSelect('transaction.consultant', 'consultant')
      .leftJoinAndSelect('transaction.booking', 'booking')
      .orderBy('transaction.createdAt', 'DESC')
      .where('transaction.type = :type', {
        type: TransactionTypeEnum.TRANSFER_TO_WALLET,
      })
      .andWhere('consultant.id = :consultantId', { consultantId });
    if (startDate && endDate)
      query.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
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
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'total')
      .innerJoin('transaction.consultant', 'consultant')
      .where('transaction.type = :type', {
        type: TransactionTypeEnum.TRANSFER_TO_WALLET,
      })
      .andWhere('consultant.id = :consultantId', { consultantId });
    if (startDate && endDate)
      query.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
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
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.buyer', 'buyer')
      .leftJoinAndSelect('transaction.brand', 'brand')
      .leftJoinAndSelect('transaction.order', 'order')
      .orderBy('transaction.createdAt', 'DESC')
      .where('transaction.type = :type', {
        type: TransactionTypeEnum.TRANSFER_TO_WALLET,
      })
      .andWhere('brand.id = :brandId', { brandId });
    orderService.queryBuilderForOrder(query);
    if (startDate && endDate)
      query.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
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
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'total')
      .innerJoin('transaction.brand', 'brand')
      .where('transaction.type = :type', {
        type: TransactionTypeEnum.TRANSFER_TO_WALLET,
      })
      .andWhere('brand.id = :brandId', { brandId });
    if (startDate && endDate)
      query.andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
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
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.buyer', 'buyer')
      .leftJoinAndSelect('transaction.brand', 'brand')
      .leftJoinAndSelect('transaction.order', 'order')
      .orderBy('transaction.createdAt', 'DESC');
    orderService.queryBuilderForOrder(query);

    if (loginUser) {
      query.where('buyer.id = :loginUser', { loginUser });
    }
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
    filterTransactionRequest: FilterTransactionRequest,
    loginUser?: string
  ) {
    const { types, startDate, endDate } = filterTransactionRequest;
    const query = transactionRepository
      .createQueryBuilder('transaction')
      .select('COUNT(*)', 'total')
      .innerJoin('transaction.buyer', 'buyer');
    if (loginUser) {
      query.where('buyer.id = :loginUser', { loginUser });
    }
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
    startDate.setHours(-7, 0, 0, 0);
    endDate.setHours(16, 59, 59, 999);
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
      .andWhere('o.status IN (:...statuses) AND o.parent_id IS NOT NULL', {
        statuses: [
          ShippingStatusEnum.DELIVERED,
          ShippingStatusEnum.COMPLETED,
          ShippingStatusEnum.RETURNED_FAIL,
        ],
      })
      .groupBy('b.id');
    if (
      getBrandRevenueStatisticsRequest.type == StatisticsTimeEnum.SPECIFIC_TIME
    ) {
      let startDate = new Date(getBrandRevenueStatisticsRequest.startDate);
      let endDate = new Date(getBrandRevenueStatisticsRequest.endDate);
      startDate.setHours(-7, 0, 0, 0);
      endDate.setHours(16, 59, 59, 999);
      queryBuilder.andWhere('o.createdAt BETWEEN :startDate AND :endDate', {
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
      .createQueryBuilder('o')
      .innerJoin('o.account', 'a')
      .select([
        'COALESCE(COUNT(o.id), 0) AS order_quantity',
        'COALESCE(SUM(o.totalPrice), 0) AS total',
        'COALESCE(SUM(o."subTotal"), 0) AS sub_total',
        'COALESCE(SUM(o."subTotal"- o.totalPrice), 0) AS discount',
      ])
      .where('a.id = :loginUser', {
        loginUser,
      })
      .andWhere('o.status IN (:...statuses) AND o.parent_id IS NOT NULL', {
        statuses: [
          ShippingStatusEnum.DELIVERED,
          ShippingStatusEnum.COMPLETED,
          ShippingStatusEnum.RETURNED_FAIL,
        ],
      })
      .groupBy('a.id');
    if (
      getUserSpendingStatisticsRequest.type == StatisticsTimeEnum.SPECIFIC_TIME
    ) {
      let startDate = new Date(getUserSpendingStatisticsRequest.startDate);
      let endDate = new Date(getUserSpendingStatisticsRequest.endDate);
      startDate.setHours(-7, 0, 0, 0);
      endDate.setHours(16, 59, 59, 999);
      queryBuilder.andWhere('o.createdAt BETWEEN :startDate AND :endDate', {
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
    groupBuying: GroupBuying,
    balance?: number
  ) {
    const transaction = new Transaction();
    transaction.order = order;
    transaction.buyer = order.account;
    transaction.amount = order.totalPrice;
    transaction.balanceAfterTransaction = balance;
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
    const transaction = new Transaction();
    transaction.order = order;
    transaction.amount =
      order.totalPrice + order.platformVoucherDiscount - order.commissionFee;
    transaction.brand = order.brand;
    transaction.buyer = { id: order.account.id } as Account;
    transaction.paymentMethod = PaymentMethodEnum.WALLET;
    transaction.type = TransactionTypeEnum.TRANSFER_TO_WALLET;
    transaction.balanceAfterTransaction = balance;
    transaction.description = `Comission fee from order ${order.id} is ${order.commissionFee}`;
    return transaction;
  }

  async createTransactionForTransferToWalletFromBooking(
    balance: number,
    booking: Booking
  ) {
    const transaction = new Transaction();
    transaction.booking = booking;
    transaction.amount = booking.totalPrice - booking.commissionFee;
    transaction.consultant = booking.consultantService.account;
    transaction.buyer = { id: booking.account.id } as Account;
    transaction.paymentMethod = PaymentMethodEnum.WALLET;
    transaction.type = TransactionTypeEnum.TRANSFER_TO_WALLET;
    transaction.balanceAfterTransaction = balance;
    transaction.description = `Comission fee from booking ${booking.id} is ${booking.commissionFee}`;
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
    if (!wallet) throw new BadRequestError('Dont have wallet');
    walletService.increaseBalance(
      wallet,
      order.totalPrice + order.platformVoucherDiscount - order.commissionFee
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
    if (!wallet) throw new BadRequestError('Dont have wallet');
    walletService.increaseBalance(
      wallet,
      booking.totalPrice - booking.commissionFee
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
    const { productIds, orderType, brandId, eventIds, groupProductIds } =
      getDailyOrderStatisticsRequest;
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
      .createQueryBuilder('orderDetail')
      .leftJoinAndSelect('orderDetail.order', 'order')
      .innerJoin(
        'order.statusTrackings',
        'statusTracking',
        'statusTracking.status = :status AND statusTracking.createdAt BETWEEN :startDate AND :endDate',
        { status: ShippingStatusEnum.WAIT_FOR_CONFIRMATION, startDate, endDate }
      )
      .leftJoinAndSelect('order.account', 'account')
      .leftJoinAndSelect('order.groupBuying', 'groupBuying')
      .leftJoinAndSelect('groupBuying.groupProduct', 'groupProduct')
      .leftJoinAndSelect(
        'orderDetail.productClassification',
        'productClassification'
      )
      .leftJoinAndSelect('productClassification.product', 'product')
      .leftJoinAndSelect(
        'productClassification.productDiscount',
        'productDiscount'
      )
      .leftJoinAndSelect('productDiscount.product', 'discountProduct')
      .leftJoinAndSelect(
        'productClassification.preOrderProduct',
        'preOrderProduct'
      )
      .leftJoinAndSelect('preOrderProduct.product', 'preOrderProductItem')
      .select([
        "DATE_TRUNC('day', statusTracking.createdAt) as date",
        'SUM(orderDetail.totalPrice) as totalRevenue',
        'SUM(orderDetail.commissionFee) as totalCommissionFee',
        'SUM(orderDetail.totalPrice + orderDetail.platformVoucherDiscount - orderDetail.commissionFee) as actualRevenue',
        'SUM(orderDetail.quantity) as totalQuantity',
        'SUM(orderDetail.platformVoucherDiscount) as totalPlatformVoucherDiscount',
        'SUM(orderDetail.shopVoucherDiscount) as totalShopVoucherDiscount',
        'COUNT(DISTINCT order.id) as orderCount',
      ])
      .where('order.parent_id IS NOT NULL')
      .andWhere('order.status NOT IN (:...statuses)', {
        statuses: [ShippingStatusEnum.CANCELLED, ShippingStatusEnum.REFUNDED],
      })
      .groupBy("DATE_TRUNC('day', statusTracking.createdAt)")
      .orderBy('date', 'DESC');
    if (brandId) {
      queryBuilder.andWhere(
        '(order.brand_id = :brandId OR groupProduct.brand_id = :brandId)',
        {
          brandId,
        }
      );
    }
    if (orderType == OrderEnum.PRE_ORDER) {
      queryBuilder.andWhere('orderDetail.type = :type', {
        type: OrderEnum.PRE_ORDER,
      });
      if (productIds && productIds.length > 0) {
        queryBuilder.andWhere('preOrderProductItem.id IN (:...productIds)', {
          productIds,
        });
      }
      if (eventIds && eventIds.length > 0) {
        queryBuilder.andWhere('preOrderProduct.id IN (:...eventIds)', {
          eventIds,
        });
      }
    } else if (orderType == OrderEnum.FLASH_SALE) {
      queryBuilder.andWhere('orderDetail.type = :type', {
        type: OrderEnum.FLASH_SALE,
      });
      if (productIds && productIds.length > 0) {
        queryBuilder.andWhere('discountProduct.id IN (:...productIds)', {
          productIds,
        });
      }
      if (eventIds && eventIds.length > 0) {
        queryBuilder.andWhere('productDiscount.id IN (:...eventIds)', {
          eventIds,
        });
      }
    } else if (orderType == 'ALL' || !orderType) {
      if (productIds && productIds.length > 0) {
        queryBuilder.andWhere(
          '(product.id IN (:...productIds) OR discountProduct.id IN (:...productIds) OR preOrderProductItem.id IN (:...productIds))',
          {
            productIds,
          }
        );
      }
    } else if (orderType == OrderEnum.NORMAL) {
      queryBuilder.andWhere(' orderDetail.type = :type', {
        type: OrderEnum.NORMAL,
      });
      if (productIds && productIds.length > 0) {
        queryBuilder.andWhere('product.id IN (:...productIds)', {
          productIds,
        });
      }
    } else if (orderType == OrderEnum.GROUP_BUYING) {
      queryBuilder.andWhere('orderDetail.type = :type', {
        type: OrderEnum.GROUP_BUYING,
      });
      if (productIds && productIds.length > 0) {
        queryBuilder.andWhere('product.id IN (:...productIds)', {
          productIds,
        });
      }
      if (groupProductIds && groupProductIds.length > 0) {
        queryBuilder.andWhere('groupProduct.id IN (:...groupProductIds)', {
          groupProductIds,
        });
      }
    }
    const results = await queryBuilder.getRawMany();
    const dateRange = this.generateDateRange(startDate, endDate);

    const statistics = dateRange.map((date) => {
      const result = results.find(
        (r) => r.date.toISOString().split('T')[0] == date
      );
      return {
        date,
        totalRevenue: result ? parseFloat(result.totalrevenue) : 0,
        totalQuantity: result ? parseInt(result.totalquantity) : 0,
        totalCommissionFee: result ? parseFloat(result.totalcommissionfee) : 0,
        actualRevenue: result ? parseFloat(result.actualrevenue) : 0,
        totalPlatformVoucherDiscount: result
          ? parseFloat(result.totalplatformvoucherdiscount)
          : 0,
        totalShopVoucherDiscount: result
          ? parseFloat(result.totalshopvoucherdiscount)
          : 0,
        orderCount: result ? parseInt(result.ordercount) : 0,
      };
    });

    const total = statistics.reduce(
      (acc, curr) => {
        acc.totalRevenue += curr.totalRevenue;
        acc.totalQuantity += curr.totalQuantity;
        acc.totalCommissionFee += curr.totalCommissionFee;
        acc.actualRevenue += curr.actualRevenue;
        acc.totalPlatformVoucherDiscount += curr.totalPlatformVoucherDiscount;
        acc.totalShopVoucherDiscount += curr.totalShopVoucherDiscount;
        acc.orderCount += curr.orderCount;
        return acc;
      },
      {
        totalRevenue: 0,
        totalQuantity: 0,
        totalCommissionFee: 0,
        actualRevenue: 0,
        totalPlatformVoucherDiscount: 0,
        totalShopVoucherDiscount: 0,
        orderCount: 0,
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
      dates.push(currentDate.toISOString().split('T')[0]); // Chỉ lấy phần ngày (yyyy-mm-dd)
      currentDate.setDate(currentDate.getDate() + 1); // Tăng thêm một ngày
    }
    return dates;
  }

  async calculateConsultantWalletTransfers(
    consultantId: string,
    startDate: Date,
    endDate: Date
  ) {
    const result = await transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.booking', 'booking')
      .leftJoinAndSelect('transaction.consultant', 'consultant')
      .select([
        'SUM(transaction.amount) as totalAmount',
        'SUM(booking.totalPrice - transaction.amount) as totalCommissionFee',
      ])
      .where('consultant.id = :consultantId', { consultantId })
      .andWhere('transaction.type = :type', {
        type: TransactionTypeEnum.TRANSFER_TO_WALLET,
      })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return {
      totalAmount: parseFloat(result?.totalamount || '0'),
      totalCommissionFee: parseFloat(result?.totalcommissionfee || '0'),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  async calculateBrandWalletTransfers(
    brandId: string,
    startDate: Date,
    endDate: Date
  ) {
    const result = await transactionRepository
      .createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.order', 'order')
      .select([
        'SUM(transaction.amount) as totalAmount',
        'SUM(order.totalPrice + order.platformVoucherDiscount - transaction.amount) as totalCommissionFee',
      ])
      .where('transaction.brand_id = :brandId', { brandId })
      .andWhere('transaction.type = :type', {
        type: TransactionTypeEnum.TRANSFER_TO_WALLET,
      })
      .andWhere('transaction.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate,
      })
      .getRawOne();

    return {
      totalAmount: parseFloat(result?.totalamount || '0'),
      totalCommissionFee: parseFloat(result?.totalcommissionfee || '0'),
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    };
  }

  constructor() {
    super(repository);
  }
}

export const transactionService = new TransactionService();
