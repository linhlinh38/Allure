import { Queue, Worker } from 'bullmq';
import Logging from '../Logging';
import { connection } from './connection';
import { retrieveMasterConfig } from '../retrieveMasterConfig';
import { orderRepository } from '../../repositories/order.repository';
import { BadRequestError } from '../../errors/error';
import { ShippingStatusEnum } from '../enum';
import { AppDataSource } from '../../dataSource';
import { Order } from '../../entities/order.entity';
import { orderService } from '../../services/order.service';

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
          complaintRequest: true,
        },
      });
      if (!order) throw new BadRequestError('Order not exist');
      if (
        [
          ShippingStatusEnum.REFUNDED,
          ShippingStatusEnum.RETURNED_FAIL,
        ].includes(order.status) ||
        order.complaintRequest
      ) {
      } else {
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
        ]);
        isUpdate = true;
      }
      Logging.warning(
        isUpdate ? 'Updated status to REFUNDED' : 'Not update status'
      );
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
