import { Queue, Worker } from 'bullmq';
import { groupBuyingService } from '../../services/groupBuying.service';
import Logging from '../Logging';
import { connection } from './connection';

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
      const isEventEndSuccess = await groupBuyingService.endGroupBuying(groupBuyingId);
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
