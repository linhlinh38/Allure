import { Queue } from 'bullmq';

export const orderQueue = new Queue('orderQueue', {
  connection: { host: 'localhost', port: 6379 },
});

async function addOrderCheck(orderId) {
  await orderQueue.add(
    'checkPayment',
    { orderId },
    { delay: 24 * 60 * 60 * 1000 }
  );
}




