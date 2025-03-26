import { Queue, Worker } from 'bullmq';
import { groupBuyingService } from '../../services/groupBuying.service';
import Logging from '../Logging';
import { connection } from './connection';
import { FCMService } from '../../services/FCM.service';
import { fcmTokenRepository } from '../../repositories/fcmToken.repository';
import { groupBuyingRepository } from '../../repositories/groupBuying.repository';
import { ShippingStatusEnum } from '../../utils/enum';

export const endGrBuyingQueue = new Queue('endGrBuyingQueue', {
  connection,
});

export async function addGroupBuyingToQueue(
  groupBuyingId: string,
  time: number
) {
  await endGrBuyingQueue.add(
    'checkEventEnd',
    { groupBuyingId },
    { delay: Number(time) }
  );
}

const endGrBuyingQueueWorker = new Worker(
  'endGrBuyingQueue',
  async (job) => {
    try {
      const { groupBuyingId } = job.data;
      console.log(`⏳ Kiểm tra trạng thái groupBuying ${groupBuyingId}...`);

      // Lấy thông tin group buying và các đơn hàng liên quan
      const groupBuying = await groupBuyingRepository.findOne({
        where: { id: groupBuyingId },
        relations: {
          orders: {
            account: true,
            parent: true,
          },
          groupProduct: true,
        },
      });

      if (!groupBuying) {
        Logging.error('Group buying not found');
        return;
      }

      const isEventEndSuccess = await groupBuyingService.endGroupBuying(
        groupBuyingId
      );

      // Gửi thông báo cho từng đơn hàng
      for (const order of groupBuying.orders) {
        const fcmToken = await fcmTokenRepository.findOne({
          where: {
            account: {
              id: order.account.id,
            },
          },
        });

        if (fcmToken?.token) {
          try {
            // Kiểm tra trạng thái đơn hàng để xác định kết quả
            const isOrderSuccess =
              order.parent.status === ShippingStatusEnum.WAIT_FOR_CONFIRMATION;

            await FCMService.sendNotification(
              fcmToken.token,
              isOrderSuccess
                ? 'Đơn hàng group buying thành công'
                : 'Đơn hàng group buying thất bại',
              isOrderSuccess
                ? `Đơn hàng của bạn trong group buying "${groupBuying.groupProduct.name}" đã được xác nhận và đang chờ xử lý`
                : `Đơn hàng của bạn trong group buying "${groupBuying.groupProduct.name}" không đủ điều kiện thanh toán và đã bị hủy`,
              {
                type: isOrderSuccess
                  ? 'GROUP_BUYING_ORDER_SUCCESS'
                  : 'GROUP_BUYING_ORDER_FAILED',
                groupBuyingId: groupBuying.id,
                orderId: order.parent.id,
              }
            );
          } catch (err) {
            Logging.error('Failed to send FCM notification:' + err);
          }
        }
      }

      Logging.warning(
        !isEventEndSuccess
          ? 'Group buyings can not meet criteria. Cancel all orders'
          : 'End group buying success'
      );
    } catch (err) {
      Logging.error(err);
    }
  },
  {
    connection,
  }
);

endGrBuyingQueueWorker.on('completed', (job) => {
  console.log(
    `✅ Job end group buying ${job.data.groupBuyingId} đã hoàn thành`
  );
});

endGrBuyingQueueWorker.on('failed', (job, err) => {
  console.log(`❌ Job ${job.data.groupBuyingId} thất bại: ${err.message}`);
});
