import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { Transaction } from '../entities/transaction.entity';
import {
  PaymentMethodEnum,
  ShippingStatusEnum,
  StatisticsTimeEnum,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from '../utils/enum';
import { BaseService } from './base.service';
import { Order } from '../entities/order.entity';
import { GroupBuying } from '../entities/groupBuying.entity';
import { GetStatisticsRequest } from '../dtos/request/transaction.request';
import { orderRepository } from '../repositories/order.repository';
import { brandRepository } from '../repositories/brand.repository';
import { BadRequestError } from '../errors/error';

const repository = AppDataSource.getRepository(Transaction);
class TransactionService extends BaseService<Transaction> {
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
    transaction.status = TransactionStatusEnum.CANCELLED;
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
    transaction.type = TransactionTypeEnum.PURCHASE;
    transaction.status = TransactionStatusEnum.COMPLETED;
    return transaction;
  }

  createTransactionFromNormalOrder(childOrder: Order) {
    const transaction = new Transaction();
    transaction.order = childOrder;
    transaction.buyer = childOrder.account;
    transaction.amount = childOrder.totalPrice;
    transaction.brand = childOrder.brand;
    transaction.type = TransactionTypeEnum.PURCHASE;
    transaction.status = TransactionStatusEnum.PENDING;
    transaction.paymentMethod = childOrder.paymentMethod;
    return transaction;
  }

  constructor() {
    super(repository);
  }
}

export const transactionService = new TransactionService();
