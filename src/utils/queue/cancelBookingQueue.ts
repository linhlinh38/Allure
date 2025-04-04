import { Queue, Worker } from "bullmq";
import { AppDataSource } from "../../dataSource";
import { bookingRepository } from "../../repositories/booking.repository";
import { BookingStatusEnum, NotificationTypeEnum } from "../enum";
import Logging from "../Logging";
import { connection } from "./connection";
import { bookingService } from "../../services/booking.service";
import { retrieveMasterConfig } from "../retrieveMasterConfig";
import { fcmTokenRepository } from "../../repositories/fcmToken.repository";
import { FCMService } from "../../services/FCM.service";
export const cancelBookingQueue = new Queue("cancelBookingQueue", {
  connection,
});

export async function addBookingToQueue(bookingId: string, delay: number) {
  const masterConfig = await retrieveMasterConfig();
  await cancelBookingQueue.add(
    "checkBookingStatus",
    { bookingId },
    { delay } // Delay in milliseconds
  );
}

const cancelBookingQueueWorker = new Worker(
  "cancelBookingQueue",
  async (job) => {
    const { bookingId } = job.data;
    console.log(`⏳ Checking booking status for booking ID: ${bookingId}...`);
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Fetch the booking
      const booking = await bookingRepository.findOne({
        where: { id: bookingId },
        relations: ["account", "slot"],
      });

      if (!booking) {
        console.log(`❌ Booking with ID ${bookingId} not found.`);
        return;
      }

      // Check if the booking is still in a cancellable status
      if (
        booking.status === BookingStatusEnum.TO_PAY ||
        booking.status === BookingStatusEnum.WAIT_FOR_CONFIRMATION
      ) {
        // Update the booking status to cancelled
        await bookingService.cancelBooking(
          bookingId,
          undefined,
          "Auto-cancelled due to booking timeout"
        );

        //send notification to account
        const tokens = (
          await fcmTokenRepository.find({
            where: {
              account: {
                id: booking.account.id,
              },
            },
          })
        ).map((token) => token.token);
        const notificationData = {
          title: "Booking cancelled",
          body: `Booking with ID ${bookingId} has been cancelled`,
          data: {
            type: NotificationTypeEnum.BOOKING_CANCELLED,
            bookingId: booking.id,
          },
          accountIds: [booking.account.id],
          createdAt: new Date(),
        };
        await FCMService.sendMulticastNotification(tokens, notificationData);

        console.log(`✅ Booking with ID ${bookingId} has been cancelled.`);
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

// Event listeners for the worker
cancelBookingQueueWorker.on("completed", (job) => {
  console.log(`✅ Job for booking ID ${job.data.bookingId} completed.`);
});

cancelBookingQueueWorker.on("failed", (job, err) => {
  console.log(
    `❌ Job for booking ID ${job.data.bookingId} failed: ${err.message}`
  );
});
