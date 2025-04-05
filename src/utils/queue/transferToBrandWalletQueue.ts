import { Queue, Worker } from 'bullmq';
import { AppDataSource } from '../../dataSource';
import { orderRepository } from '../../repositories/order.repository';
import {
  NotificationTypeEnum,
  RoleEnum,
  ShippingStatusEnum,
} from '../enum';
import { retrieveMasterConfig } from '../retrieveMasterConfig';
import Logging from '../Logging';
import { connection } from './connection';
import { FCMService } from '../../services/FCM.service';
import { fcmTokenRepository } from '../../repositories/fcmToken.repository';
import { transactionService } from '../../services/transaction.service';

export const transferToBrandWalletQueue = new Queue(
  'transferToBrandWalletQueue',
  {
    connection,
  }
);

export async function addtransferToBrandWalletToQueue(orderId: string) {
  const masterConfig = await retrieveMasterConfig();
  await transferToBrandWalletQueue.add(
    'transferToBrandWallet',
    { orderId },
    { delay: Number(masterConfig.refundTimeExpired) }
  );
}

const transferToBrandWalletQueueWorker = new Worker(
  'transferToBrandWalletQueue',
  async (job) => {
    const { orderId } = job.data;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await orderRepository.findOne({
        where: { id: orderId },
        relations: {
          account: true,
          brand: {
            accounts: { role: true },
          },
        },
      });
      if (!order) return;
      if (
        ![ShippingStatusEnum.DELIVERED, ShippingStatusEnum.COMPLETED].includes(
          order.status
        )
      )
        return;
      await transactionService.transferToBrandWallet(order.id, queryRunner);
      const masterConfig = await retrieveMasterConfig();
      const manager = order.brand.accounts.find(
        (account) => account.role.role == RoleEnum.MANAGER
      );
      // Lấy FCM token của user
      const fcmTokens = await fcmTokenRepository.find({
        where: {
          account: {
            id: manager.id,
          },
        },
      });
      // Gửi thông báo cho người dùng
      if (fcmTokens && fcmTokens.length > 0) {
        try {
          await FCMService.sendMulticastNotification(
            fcmTokens.map((token) => token.token),
            {
              title: `Bạn được nhận tiền từ đơn hàng ${order.id}`,
              body: `Bạn được nhận ${
                order.totalPrice * (1 - masterConfig.commissionFee)
              } từ đơn hàng ${order.id}`,
              data: {
                type: NotificationTypeEnum.TRANSFER_TO_WALLET,
                orderId: order.id,
              },
              accountIds: [manager.id],
              createdAt: new Date(),
            }
          );
        } catch (err) {
          Logging.error('Failed to send FCM notification:' + err);
        }
      }
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

transferToBrandWalletQueueWorker.on('completed', (job) => {
  console.log(`✅ Job transferToBrandWallet đã hoàn thành`);
});

transferToBrandWalletQueueWorker.on('failed', (job, err) => {
  console.log(
    `❌ Job transferToBrandWallet thất bại: ${err.message}`
  );
});
