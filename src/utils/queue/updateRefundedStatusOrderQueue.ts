import { Queue, Worker } from 'bullmq';
import Logging from '../Logging';
import { connection } from './connection';
import { retrieveMasterConfig } from '../retrieveMasterConfig';
import { orderRepository } from '../../repositories/order.repository';
import { BadRequestError } from '../../errors/error';
import {
  OrderEnum,
  OrderRequestTypeEnum,
  ShippingStatusEnum,
  TransactionTypeEnum,
} from '../enum';
import { AppDataSource } from '../../dataSource';
import { Order } from '../../entities/order.entity';
import { orderService } from '../../services/order.service';
import { walletRepository } from '../../repositories/wallet.reposirory';
import { transactionService } from '../../services/transaction.service';
import { Transaction } from '../../entities/transaction.entity';
import { VoucherWallet } from '../../entities/voucherWallet.entity';
import { FCMService } from '../../services/FCM.service';
import { fcmTokenRepository } from '../../repositories/fcmToken.repository';

export const updateRefundedStatusOrderQueue = new Queue(
  'updateRefundedStatusOrderQueue',
  {
    connection,
  }
);

export async function addUpdateRefundedStatusOrderToQueue(orderId: string) {
  const masterConfig = await retrieveMasterConfig();
  await updateRefundedStatusOrderQueue.add(
    'updateRefundedStatusOrder',
    { orderId },
    { delay: Number(masterConfig.autoUpdateOrderToRefundedStatusTime) }
  );
}

const updateRefundedStatusOrderQueueWorker = new Worker(
  'updateRefundedStatusOrderQueue',
  async (job) => {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let isUpdate = false;
      const { orderId } = job.data;
      console.log(
        `⏳ Kiểm tra để update status order ${orderId} sang REFUNDED`
      );
      const order = await orderRepository.findOne({
        where: { id: orderId },
        relations: {
          requests: true,
          account: true,
          brand: true,
          voucher: true,
        },
      });
      const complaintRequest = order.requests.find(
        (request) => request.type == OrderRequestTypeEnum.COMPLAINT
      );
      if (!order) throw new BadRequestError('Order not exist');
      if (
        [
          ShippingStatusEnum.REFUNDED,
          ShippingStatusEnum.RETURNED_FAIL,
        ].includes(order.status) ||
        complaintRequest
      ) {
      } else {
        //refund to wallet
        const wallet = await walletRepository.findOne({
          where: {
            id: order.account.id,
          },
        });
        wallet.balance += order.totalPrice;
        await queryRunner.manager.save(wallet);

        await Promise.all([
          //update order status
          (async () => {
            order.status = ShippingStatusEnum.REFUNDED;
            await queryRunner.manager.save(Order, order);
          })(),
          //create status tracking
          orderService.createStatusTracking(
            order,
            order.account.id,
            ShippingStatusEnum.REFUNDED,
            'Auto update',
            queryRunner
          ),
          //create transaction
          (async () => {
            const transaction =
              await transactionService.createTransactionFromChildOrder(
                complaintRequest.order,
                TransactionTypeEnum.ORDER_REFUND
              );
            await queryRunner.manager.save(Transaction, transaction);
          })(),
        ]);
        //refund voucher for type gr buying
        if (order.type == OrderEnum.GROUP_BUYING) {
          const voucher = order.voucher;
          const voucherWallet = new VoucherWallet();
          voucherWallet.owner = order.account;
          voucherWallet.voucher = voucher;
          await queryRunner.manager.save(VoucherWallet, voucherWallet);
        }
        isUpdate = true;

        // Gửi thông báo cho người dùng
        const fcmToken = await fcmTokenRepository.findOne({
          where: {
            account: {
              id: order.account.id,
            },
          },
        });

        if (fcmToken?.token) {
          try {
            await FCMService.sendNotification(
              fcmToken.token,
              'Hoàn tiền thành công',
              `Đơn hàng #${
                order.id
              } của bạn đã được hoàn tiền ${order.totalPrice.toLocaleString(
                'vi-VN'
              )}đ vào ví`,
              {
                type: 'REFUND_SUCCESS',
                orderId: order.id,
                amount: order.totalPrice.toString(),
              }
            );
          } catch (err) {
            Logging.error('Failed to send FCM notification:' + err);
          }
        }
      }
      Logging.warning(
        isUpdate ? 'Updated status to REFUNDED' : 'Not update status'
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      Logging.error(error);
    } finally {
      await queryRunner.release();
    }
  },
  {
    connection,
  }
);

updateRefundedStatusOrderQueueWorker.on('completed', (job) => {
  console.log(
    `✅Job check to update status order ${job.data.orderId} to REFUNDED completed`
  );
});

updateRefundedStatusOrderQueueWorker.on('failed', (job, err) => {
  console.log(
    `❌ ✅Job check to update status order ${job.data.orderId} to REFUNDED failed: ${err.message}`
  );
});
