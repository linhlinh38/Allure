import { AppDataSource } from "../dataSource";
import { Booking } from "../entities/booking.entity";
import { Question } from "../entities/question.entity";
import { ServiceBookingForm } from "../entities/serviceBookingForm.entity";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(Booking);
class BookingService extends BaseService<Booking> {
  constructor() {
    super(repository);
  }
}
export const bookingService = new BookingService();
