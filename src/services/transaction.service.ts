import { QueryRunner } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { Transaction } from '../entities/transaction.entity';
import {
  PaymentMethodEnum,
  TransactionStatusEnum,
  TransactionTypeEnum,
} from '../utils/enum';
import { BaseService } from './base.service';
import { Order } from '../entities/order.entity';
import { GroupBuying } from '../entities/groupBuying.entity';

const repository = AppDataSource.getRepository(Transaction);
class TransactionService extends BaseService<Transaction> {
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
