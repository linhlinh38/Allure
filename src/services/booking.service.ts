import { Between } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { BookingRequest } from '../dtos/request/booking.request';
import { Account } from '../entities/account.entity';
import { Booking } from '../entities/booking.entity';
import { BadRequestError } from '../errors/error';
import { bookingRepository } from '../repositories/booking.repository';
import { slotRepository } from '../repositories/slot.repository';
import { BookingStatusEnum, BookingTypeEnum, RoleEnum } from '../utils/enum';
import { BaseService } from './base.service';
import { accountRepository } from '../repositories/account.repository';

const repository = AppDataSource.getRepository(Booking);
class BookingService extends BaseService<Booking> {
  async getBookingInterviews(loginUser: string) {
    const account = await accountRepository.findOne({
      where: {
        id: loginUser,
      },
      relations: {
        role: true,
        brands: true,
      },
    });
    if (
      account.role.role == RoleEnum.ADMIN ||
      account.role.role == RoleEnum.OPERATOR
    ) {
      return await bookingRepository.find({
        where: {
          type: BookingTypeEnum.INTERVIEW,
          slot: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    } else if (account.role.role == RoleEnum.MANAGER) {
      return await bookingRepository.find({
        where: {
          type: BookingTypeEnum.INTERVIEW,
          account: { id: loginUser },
          slot: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    }
    return [];
  }
  async getAvailableSlotsForInterview(startDate: Date, endDate: Date) {
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const slots = await slotRepository.find({});
    const bookings = await bookingRepository.find({
      where: {
        startTime: Between(startDate, endDate),
        endTime: Between(startDate, endDate),
        status: BookingStatusEnum.BOOKING_CONFIRMED,
      },
      relations: {
        slot: true,
      },
    });
    const availableSlots = slots.filter((slot) => {
      const bookedSlot = bookings.find((booking) => booking.slot.id == slot.id);
      return !bookedSlot;
    });
    return availableSlots;
  }

  async updateStatus(id: string, status: BookingStatusEnum) {
    const booking = await bookingRepository.findOne({
      where: {
        id,
      },
    });
    if (!booking) throw new BadRequestError('Booking not found');
    booking.status = status;
    await booking.save();
  }
  async createBooking(bookingRequest: BookingRequest, loginUser: string) {
    if (bookingRequest.type == BookingTypeEnum.INTERVIEW) {
      const bookings = await repository.find({
        where: { account: { id: loginUser } },
        relations: ['slot'],
        order: { createdAt: 'DESC' },
        take: 1,
      });
      const booking = bookings[0];
      if (booking && booking.status == BookingStatusEnum.WAIT_FOR_CONFIRMATION)
        throw new BadRequestError(
          'You have already booked an interview. Please wait for process'
        );
      const slot = await slotRepository.findOneBy({ id: bookingRequest.slot });
      if (!slot) throw new BadRequestError('Slot not found');
      const existedBooking = await bookingRepository.findOne({
        where: {
          slot: { id: bookingRequest.slot },
          startTime: bookingRequest.startTime,
          endTime: bookingRequest.endTime,
          status: BookingStatusEnum.BOOKING_CONFIRMED,
        },
      });
      if (existedBooking) throw new BadRequestError('Slot has been booked');
      const createdBooking = new Booking();
      Object.assign(createdBooking, bookingRequest);
      createdBooking.status = BookingStatusEnum.WAIT_FOR_CONFIRMATION;
      createdBooking.account = new Account();
      createdBooking.account.id = loginUser;
      await createdBooking.save();
      return;
    }
    const createdBooking = new Booking();
    Object.assign(createdBooking, bookingRequest);
    createdBooking.status = BookingStatusEnum.WAIT_FOR_CONFIRMATION;
    createdBooking.account = new Account();
    createdBooking.account.id = loginUser;
    await createdBooking.save();
  }
  async getStatusBookingInterview(loginUser: string) {
    const bookings = await repository.find({
      where: { account: { id: loginUser } },
      relations: ['slot'],
      order: { createdAt: 'DESC' },
      take: 1,
    });
    const booking = bookings[0];
    if (!booking) throw new BadRequestError('Booking not found');
    if (
      booking.startTime.getTime() <= Date.now() &&
      booking.status == BookingStatusEnum.WAIT_FOR_CONFIRMATION
    ) {
      booking.status = BookingStatusEnum.CANCELLED;
      await booking.save();
    }
    return booking.status;
  }
  constructor() {
    super(repository);
  }
}
export const bookingService = new BookingService();
