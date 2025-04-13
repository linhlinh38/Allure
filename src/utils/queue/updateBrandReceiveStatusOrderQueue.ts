import { Queue, Worker } from 'bullmq';
import Logging from '../Logging';
import { connection } from './connection';
import { orderRepository } from '../../repositories/order.repository';
import { BadRequestError } from '../../errors/error';
import { NotificationTypeEnum, ShippingStatusEnum } from '../enum';
import { AppDataSource } from '../../dataSource';
import { Order } from '../../entities/order.entity';
import { orderService } from '../../services/order.service';
import { FCMService } from '../../services/FCM.service';
import { fcmTokenRepository } from '../../repositories/fcmToken.repository';

export const updateBrandReceiveStatusOrderQueue = new Queue(
  'updateBrandReceiveStatusOrderQueue',
  {
    connection,
  }
);

export async function addUpdateBrandReceiveStatusOrderToQueue(order: Order) {
  await updateBrandReceiveStatusOrderQueue.add(
    'updateBrandReceiveStatusOrder',
    { orderId: order.id },
    { delay: Math.max(order.expiredReceivedTime.getTime() - Date.now(), 0) }
  );
}

const uupdateBrandReceiveStatusOrderQueueWorker = new Worker(
  'updateBrandReceiveStatusOrderQueue',
  async (job) => {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let isUpdate = false;
      const { orderId } = job.data;
      console.log(
        `⏳ Kiểm tra để update status order ${orderId} sang BRAND_RECEIVED`
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
      if (!order) throw new BadRequestError('Order not exist');
      if (order.status != ShippingStatusEnum.RETURNING) {
        Logging.warning('Not update status');
      } else if (order.expiredReceivedTime <= new Date()) {
        Logging.warning('Not update status');
      } else {
        order.status = ShippingStatusEnum.BRAND_RECEIVED;
        await Promise.all([
          //update order status
          (async () => {
            order.status = ShippingStatusEnum.BRAND_RECEIVED;
            await queryRunner.manager.save(Order, order);
          })(),
          //create status tracking
          orderService.createStatusTracking(
            order,
            null,
            ShippingStatusEnum.BRAND_RECEIVED,
            'Auto update',
            queryRunner
          ),
        ]);
        isUpdate = true;

        // Gửi thông báo cho người dùng
        const fcmTokens = await fcmTokenRepository.find({
          where: {
            account: {
              id: order.account.id,
            },
          },
        });

        if (fcmTokens.length > 0) {
          try {
            await FCMService.sendMulticastNotification(
              fcmTokens.map((fcmToken) => fcmToken.token),
              {
                title: 'Brand đã nhận hàng hoàn trả',
                body: `Đơn hàng #${order.id} của bạn đã được brand xác nhận nhận hàng hoàn trả`,
                data: {
                  type: NotificationTypeEnum.UPDATE_ORDER_STATUS,
                  orderId: order.id,
                },
                accountIds: [order.account.id],
                createdAt: new Date(),
              }
            );
          } catch (err) {
            Logging.error('Failed to send FCM notification:' + err);
          }
        }

        Logging.warning(
          isUpdate ? 'Updated status to BRAND_RECEIVED' : 'Not update status'
        );
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

uupdateBrandReceiveStatusOrderQueueWorker.on('completed', (job) => {
  console.log(
    `✅Job check to update status order ${job.data.orderId} to BRAND_RECEIVED completed`
  );
});

uupdateBrandReceiveStatusOrderQueueWorker.on('failed', (job, err) => {
  console.log(
    `❌ ✅Job check to update status order ${job.data.orderId} to BRAND_RECEIVED failed: ${err.message}`
  );
});
