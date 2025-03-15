import { Queue, Worker } from 'bullmq';
import Logging from '../Logging';
import { connection } from './connection';
import { retrieveMasterConfig } from '../retrieveMasterConfig';
import { orderRepository } from '../../repositories/order.repository';
import { BadRequestError } from '../../errors/error';
import {
  ShippingStatusEnum,
} from '../enum';
import { AppDataSource } from '../../dataSource';
import { Order } from '../../entities/order.entity';
import { orderService } from '../../services/order.service';

export const updateBrandReceiveStatusOrderQueue = new Queue(
  'updateBrandReceiveStatusOrderQueue',
  {
    connection,
  }
);

export async function addUpdateBrandReceiveStatusOrderToQueue(orderId: string) {
  const masterConfig = await retrieveMasterConfig();
  await updateBrandReceiveStatusOrderQueue.add(
    'updateBrandReceiveStatusOrder',
    { orderId },
    { delay: Number(masterConfig.autoUpdateOrderToRefundedStatusTime) }
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
        return;
      }
      if (order.expiredReceivedTime <= new Date()) {
        Logging.warning('Not update status');
        return;
      }
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
          order.account.id,
          ShippingStatusEnum.BRAND_RECEIVED,
          'Auto update',
          queryRunner
        ),
      ]);
      isUpdate = true;
      Logging.warning(
        isUpdate ? 'Updated status to BRAND_RECEIVED' : 'Not update status'
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
