import { Queue, Worker } from 'bullmq';
import { AppDataSource } from '../../dataSource';
import { orderRepository } from '../../repositories/order.repository';
import { orderService } from '../../services/order.service';
import { ShippingStatusEnum } from '../enum';
import { retrieveMasterConfig } from '../retrieveMasterConfig';
import Logging from '../Logging';
import { connection } from './connection';

export const cancelOrderQueue = new Queue('cancelOrderQueue', {
  connection,
});

export async function addNormalOrderToQueue(orderId: string) {
  const masterConfig = await retrieveMasterConfig();
  await cancelOrderQueue.add(
    'checkStatus',
    { orderId },
    { delay: Number(masterConfig.autoCancelOrderTime) }
  );
}

const cancelOrderQueueWorker = new Worker(
  'cancelOrderQueue',
  async (job) => {
    const { orderId } = job.data;
    console.log(`⏳ Kiểm tra trạng thái đơn hàng ${orderId}...`);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const parentOrder = await orderRepository.findOne({
        where: {
          id: orderId,
        },
        relations: {
          children: {
            voucher: true,
            account: true,
            orderDetails: {
              productClassification: true,
            },
          },
          account: true,
          voucher: true,
        },
      });
      let isPaid = false;
      for (const childOrder of parentOrder.children) {
        if (childOrder.status != ShippingStatusEnum.TO_PAY) {
          isPaid = true;
          break;
        }
      }
      if (
        parentOrder &&
        parentOrder.status == ShippingStatusEnum.TO_PAY &&
        !isPaid
      ) {
        await orderService.cancelParentOrder(parentOrder, queryRunner);
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

cancelOrderQueueWorker.on('completed', (job) => {
  console.log(`✅ Job kiểm tra đơn hàng ${job.data.orderId} đã hoàn thành`);
});

cancelOrderQueueWorker.on('failed', (job, err) => {
  console.log(`❌ Job ${job.data.orderId} thất bại: ${err.message}`);
});
