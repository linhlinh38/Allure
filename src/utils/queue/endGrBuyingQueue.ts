import { Queue, Worker } from "bullmq";
import { groupBuyingService } from "../../services/groupBuying.service";
import { config } from "../../configs/envConfig";

export const endGrBuyingQueue = new Queue("endGrBuyingQueue", {
  connection: { host: config.REDIS_HOST, port: config.REDIS_PORT },
});

export async function addGroupBuyingToQueue(
  groupBuyingId: string,
  time: number
) {
  await endGrBuyingQueue.add(
    "checkEventEnd",
    { groupBuyingId },
    { delay: time }
  );
}

const endGrBuyingQueueWorker = new Worker(
  "endGrBuyingQueue",
  async (job) => {
    const { groupBuyingId } = job.data;
    console.log(`⏳ Kiểm tra trạng thái groupBuying ${groupBuyingId}...`);
    await groupBuyingService.endGroupBuying(groupBuyingId);
  },
  {
    connection: { host: config.REDIS_HOST, port: config.REDIS_PORT },
  }
);

endGrBuyingQueueWorker.on("completed", (job) => {
  console.log(
    `✅ Job end group buying ${job.data.groupBuyingId} đã hoàn thành`
  );
});

endGrBuyingQueueWorker.on("failed", (job, err) => {
  console.log(`❌ Job ${job.data.groupBuyingId} thất bại: ${err.message}`);
});
