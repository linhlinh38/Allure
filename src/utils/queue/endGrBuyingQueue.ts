import { Queue, Worker } from 'bullmq';
import { groupBuyingService } from '../../services/groupBuying.service';

export const endGrBuyingQueue = new Queue('endGrBuyingQueue', {
  connection: { host: 'localhost', port: 6379 },
});

export async function addGroupBuyingToQueue(
  groupBuyingId: string,
  time: number
) {
  await endGrBuyingQueue.add(
    'checkEventEnd',
    { groupBuyingId },
    { delay: time }
  );
}

const endGrBuyingQueueWorker = new Worker(
  'endGrBuyingQueue',
  async (job) => {
    const { groupBuyingId } = job.data;
    console.log(`⏳ Kiểm tra trạng thái groupBuying ${groupBuyingId}...`);
    await groupBuyingService.endGroupBuying(groupBuyingId);
  },
  {
    connection: { host: 'localhost', port: 6379 },
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
