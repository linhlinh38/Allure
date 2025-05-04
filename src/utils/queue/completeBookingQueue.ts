import { Queue, Worker } from "bullmq";
import { AppDataSource } from "../../dataSource";
import { bookingRepository } from "../../repositories/booking.repository";
import {
  BookingStatusEnum,
  BookingTypeEnum,
  NotificationTypeEnum,
  ReportStatusEnum,
} from "../enum";
import Logging from "../Logging";
import { connection } from "./connection";
import { bookingService } from "../../services/booking.service";
import { retrieveMasterConfig } from "../retrieveMasterConfig";
import { fcmTokenRepository } from "../../repositories/fcmToken.repository";
import { FCMService } from "../../services/FCM.service";
import { transactionService } from "../../services/transaction.service";
import { StatusTracking } from "../../entities/statusTracking.entity";
import { Booking } from "../../entities/booking.entity";
export const completeBookingQueue = new Queue("completeBookingQueue", {
  connection,
});

export async function addCompleteBookingToQueue(
  bookingId: string,
  delay: number
) {
  await completeBookingQueue.add(
    "completeBooking",
    { bookingId },
    { delay: Number(delay) } // Delay in milliseconds
  );
}

const completeBookingQueueWorker = new Worker(
  "completeBookingQueue",
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
        relations: ["account", "slot", "report"],
      });

      if (!booking) {
        console.log(`❌ Booking with ID ${bookingId} not found.`);
        return;
      }

      if (
        booking.type == BookingTypeEnum.SERVICE &&
        booking.report &&
        booking.report.status !== ReportStatusEnum.REJECTED &&
        booking.report.status !== ReportStatusEnum.CANCELLED
      ) {
        await addCompleteBookingToQueue(booking.id, 2592000000);
      } else {
        await queryRunner.manager.update(
          Booking,
          {
            id: booking.id,
          },
          { status: BookingStatusEnum.COMPLETED }
        );
        const statusTracking = bookingService.updateBookingStatus(
          booking,
          BookingStatusEnum.COMPLETED,
          null,
          "Tự động cập nhật trạng thái hoàn thành"
        );
        await queryRunner.manager.save(StatusTracking, statusTracking);
        if (booking.type == BookingTypeEnum.SERVICE) {
          await transactionService.transferToConsultantWallet(
            booking.id,
            queryRunner
          );
        }
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
          title: "Booking completed",
          body: `Booking with ID ${bookingId} has been completed`,
          data: {
            type: NotificationTypeEnum.BOOKING_COMPLETED,
            bookingId: booking.id,
          },
          accountIds: [booking.account.id],
          createdAt: new Date(),
        };
        await FCMService.sendMulticastNotification(tokens, notificationData);
        console.log(`✅ Booking with ID ${bookingId} has been completed.`);
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
completeBookingQueueWorker.on("completed", (job) => {
  console.log(`✅ Job for booking ID ${job.data.bookingId} completed.`);
});

completeBookingQueueWorker.on("failed", (job, err) => {
  console.log(
    `❌ Job for booking ID ${job.data.bookingId} failed: ${err.message}`
  );
});
