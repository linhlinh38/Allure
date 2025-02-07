import { Queue, Worker } from 'bullmq';
import { orderRepository } from '../repositories/order.repository';
import { AppDataSource } from '../dataSource';
import { ShippingStatusEnum } from './enum';
import { orderService } from '../services/order.service';
import { groupBuyingService } from '../services/groupBuying.service';

export const normalOrderQueue = new Queue('normalOrderQueue', {
  connection: { host: 'localhost', port: 6379 },
});

export async function addNormalOrderToQueue(orderId: string) {
  await normalOrderQueue.add(
    'checkPayment',
    { orderId },
    { delay: 24 * 60 * 60 * 1000 }
  );
}

const normalOrderQueueWorker = new Worker(
  'normalOrderQueue',
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
      throw error;
    } finally {
      await queryRunner.release();
    }
  },
  {
    connection: { host: 'localhost', port: 6379 },
  }
);

normalOrderQueueWorker.on('completed', (job) => {
  console.log(`✅ Job kiểm tra đơn hàng ${job.data.orderId} đã hoàn thành`);
});

normalOrderQueueWorker.on('failed', (job, err) => {
  console.log(`❌ Job ${job.data.orderId} thất bại: ${err.message}`);
});

export const groupOrderQueue = new Queue('groupOrderQueue', {
  connection: { host: 'localhost', port: 6379 },
});

export async function addGroupOrderToQueue(
  groupBuyingId: string,
  time: number
) {
  await groupOrderQueue.add(
    'checkEventEnd',
    { groupBuyingId },
    { delay: time }
  );
}

const groupOrderQueueWorker = new Worker(
  'groupOrderQueue',
  async (job) => {
    const { groupBuyingId } = job.data;
    console.log(`⏳ Kiểm tra trạng thái groupBuying ${groupBuyingId}...`);
    await groupBuyingService.endGroupBuying(groupBuyingId);
  },
  {
    connection: { host: 'localhost', port: 6379 },
  }
);

groupOrderQueueWorker.on('completed', (job) => {
  console.log(
    `✅ Job end group buying ${job.data.groupBuyingId} đã hoàn thành`
  );
});

groupOrderQueueWorker.on('failed', (job, err) => {
  console.log(`❌ Job ${job.data.groupBuyingId} thất bại: ${err.message}`);
});