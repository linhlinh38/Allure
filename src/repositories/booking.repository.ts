import { AppDataSource } from "../dataSource";
import { Booking } from "../entities/booking.entity";

export const bookingRepository = AppDataSource.getRepository(Booking);
