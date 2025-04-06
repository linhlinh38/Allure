import { Queue, Worker } from "bullmq";
import { AppDataSource } from "../../dataSource";
import { orderRepository } from "../../repositories/order.repository";
import { orderService } from "../../services/order.service";
import {
  NotificationTypeEnum,
  OrderRequestTypeEnum,
  RequestStatusEnum,
  ShippingStatusEnum,
} from "../enum";
import { retrieveMasterConfig } from "../retrieveMasterConfig";
import Logging from "../Logging";
import { connection } from "./connection";
import { orderRequestRepository } from "../../repositories/orderRequest.repository";
import { FCMService } from "../../services/FCM.service";
import { fcmTokenRepository } from "../../repositories/fcmToken.repository";

export const approveRefundRequestQueue = new Queue(
  "approveRefundRequestQueue",
  {
    connection,
  }
);

export async function addRefundRequestToQueue(id: string) {
  const masterConfig = await retrieveMasterConfig();
  await approveRefundRequestQueue.add(
    "checkStatus",
    { id },
    { delay: Number(masterConfig.autoApproveRefundRequestTime) }
  );
}

const approveRefundRequestQueueWorker = new Worker(
  "approveRefundRequestQueue",
  async (job) => {
    const { id } = job.data;
    console.log(`⏳ Kiểm tra trạng thái refund request ${id}...`);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const refundRequest = await orderRequestRepository.findOne({
        where: { id, type: OrderRequestTypeEnum.REFUND },
        relations: {
          order: {
            account: true,
          },
        },
      });
      if (!refundRequest) return;
      if (refundRequest.status != RequestStatusEnum.PENDING) return;
      const order = refundRequest.order;
      await Promise.all([
        //update refund request status to APPROVED
        (async () => {
          refundRequest.status = RequestStatusEnum.APPROVED;
          await queryRunner.manager.save(refundRequest);
        })(),
        //update order status to RETURNING
        (async () => {
          order.status = ShippingStatusEnum.RETURNING;
          await orderRepository.save(order);
        })(),
        //update status tracking to RETURNING
        orderService.createStatusTracking(
          order,
          null,
          ShippingStatusEnum.RETURNING,
          refundRequest.reason,
          queryRunner
        ),
      ]);

      // Lấy FCM token của user
      const fcmTokens = await fcmTokenRepository.find({
        where: {
          account: {
            id: order.account.id,
          },
        },
      });

      // Gửi thông báo cho người dùng
      if (fcmTokens && fcmTokens.length > 0) {
        try {
          await FCMService.sendMulticastNotification(
            fcmTokens.map((token) => token.token),
            {
              title: "Yêu cầu hoàn tiền đã được chấp nhận",
              body: `Đơn hàng #${order.id} của bạn đã được chấp nhận hoàn tiền`,
              data: {
                type: NotificationTypeEnum.UPDATE_ORDER_STATUS,
                orderId: order.id,
              },
              accountIds: [order.account.id],
              createdAt: new Date(),
            }
          );
        } catch (err) {
          Logging.error("Failed to send FCM notification:" + err);
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

approveRefundRequestQueueWorker.on("completed", (job) => {
  console.log(`✅ Job kiểm tra đơn hàng ${job.data.orderId} đã hoàn thành`);
});

approveRefundRequestQueueWorker.on("failed", (job, err) => {
  console.log(`❌ Job ${job.data.orderId} thất bại: ${err.message}`);
});
