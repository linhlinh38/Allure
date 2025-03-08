import { Queue, Worker } from 'bullmq';
import { AppDataSource } from '../../dataSource';
import { orderRepository } from '../../repositories/order.repository';
import { orderService } from '../../services/order.service';
import { RequestStatusEnum, ShippingStatusEnum } from '../enum';
import { retrieveMasterConfig } from '../retrieveMasterConfig';
import { refundRequestRepository } from '../../repositories/refundRequest.repository';
import Logging from '../Logging';
import { connection } from './connection';

export const approveRefundRequestQueue = new Queue(
  'approveRefundRequestQueue',
  {
    connection,
  }
);

export async function addRefundRequestToQueue(id: string) {
  const masterConfig = await retrieveMasterConfig();
  await approveRefundRequestQueue.add(
    'checkStatus',
    { id },
    { delay: Number(masterConfig.autoApproveRefundRequestTime) }
  );
}

const approveRefundRequestQueueWorker = new Worker(
  'approveRefundRequestQueue',
  async (job) => {
    const { id } = job.data;
    console.log(`⏳ Kiểm tra trạng thái refund request ${id}...`);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const refundRequest = await refundRequestRepository.findOne({
        where: { id },
        relations: {
          order: true,
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
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      Logging.error(error);
    } finally {
      await queryRunner.release();
    }
  },
  {
    connection: { host: 'localhost', port: 6379 },
  }
);

approveRefundRequestQueueWorker.on('completed', (job) => {
  console.log(`✅ Job kiểm tra đơn hàng ${job.data.orderId} đã hoàn thành`);
});

approveRefundRequestQueueWorker.on('failed', (job, err) => {
  console.log(`❌ Job ${job.data.orderId} thất bại: ${err.message}`);
});
