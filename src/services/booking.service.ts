import { In } from 'typeorm';
import { Between, SelectQueryBuilder } from 'typeorm';
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
import { brandRepository } from '../repositories/brand.repository';

const repository = AppDataSource.getRepository(Booking);
class BookingService extends BaseService<Booking> {
  async getBookingOfBrand(brandId: string) {
    const brand = await brandRepository.findOne({
      where: {
        id: brandId,
      },
    });
    if (!brand) throw new BadRequestError('Brand not found');
    const booking = await bookingRepository.findOne({
      where: {
        brand: { id: brandId },
        status: In([
          BookingStatusEnum.BOOKING_CONFIRMED,
          BookingStatusEnum.WAIT_FOR_CONFIRMATION,
          BookingStatusEnum.COMPLETED,
        ]),
      },
    });
    if (!booking) throw new BadRequestError('Booking not found');
    return booking;
  }
  async getById(id: string) {
    const booking = await bookingRepository.findOne({
      where: {
        id,
      },
      relations: {
        account: true,
        brand: true,
        slot: true,
      },
    });
    if (!booking) throw new BadRequestError('Booking not found');
    return booking;
  }
  async noteResult(id: string, resultNote: string, loginUser: string) {
    const booking = await bookingRepository.findOne({
      where: { id },
      relations: {
        brand: {
          reviewer: true,
        },
      },
    });
    if (!booking) throw new BadRequestError(`Booking not found`);
    if (!booking.brand.reviewer || booking.brand.reviewer.id != loginUser)
      throw new BadRequestError('Only reviewer can note result');
    booking.resultNote = resultNote;
    await repository.save(booking);
  }

  queryBuilderForBooking(queryBuilder: SelectQueryBuilder<any>) {
    queryBuilder
      .leftJoinAndSelect('booking.consultantService', 'consultantService')
      .leftJoinAndSelect('consultantService.account', 'consultant')
      .leftJoinAndSelect('consultantService.images', 'consultantServiceImages');
  }

  // async assignForInterview(id: string, assigneeId: string) {
  //   const booking = await bookingRepository.findOne({
  //     where: { id },
  //     relations: {
  //       assigneeToInterview: true,
  //     },
  //   });
  //   if (!booking) throw new BadRequestError('Booking not found');
  //   if (booking.status == BookingStatusEnum.COMPLETED)
  //     throw new BadRequestError(`Booking is completed. Can not assign`);
  //   if (booking.assigneeToInterview?.id == assigneeId) return;
  //   const assignee = await accountRepository.findOneBy({ id: assigneeId });
  //   if (!assignee) throw new BadRequestError(`Assignee not found`);
  //   const existedBookingThatTime = await bookingRepository.findOne({
  //     where: {
  //       startTime: LessThanOrEqual(booking.endTime),
  //       endTime: MoreThanOrEqual(booking.startTime),
  //       assigneeToInterview: { id: assigneeId },
  //     },
  //   });
  //   if (existedBookingThatTime) throw new BadRequestError('Overlap time slot');
  //   booking.assigneeToInterview = { id: assigneeId } as Account;
  //   await booking.save();
  // }

  async getMyBookings(loginUser: string) {
    const account = await accountRepository.findOne({
      where: {
        id: loginUser,
      },
      relations: {
        role: true,
        brands: true,
      },
    });
    if (account.role.role == RoleEnum.ADMIN) {
      return await bookingRepository.find({
        // where: {
        //   type: BookingTypeEnum.INTERVIEW,
        // },
        relations: {
          brand: true,
          account: true,
          slot: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    } else if (account.role.role == RoleEnum.OPERATOR) {
      return await bookingRepository.find({
        where: {
          // type: BookingTypeEnum.INTERVIEW,
          brand: { reviewer: { id: loginUser } },
        },
        relations: {
          brand: true,
          account: true,
          slot: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    } else if (account.role.role == RoleEnum.MANAGER) {
      return await bookingRepository.find({
        where: {
          // type: BookingTypeEnum.INTERVIEW,
          account: { id: loginUser },
        },
        relations: {
          brand: { reviewer: true },
          account: true,
          slot: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    }
    return [];
  }
  async getSomeoneSlots(startDate: Date, endDate: Date, loginUser: string) {
    startDate = new Date(startDate);
    endDate = new Date(endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    const account = await accountRepository.findOne({
      where: {
        id: loginUser,
      },
      relations: {
        role: true,
        workingSlots: true,
      },
    });
    if (![RoleEnum.CONSULTANT, RoleEnum.OPERATOR].includes(account.role.role)) {
      throw new BadRequestError('Only apply for consultant or operator');
    }

    const slots = account.workingSlots;
    const bookings = await bookingRepository.find({
      where: {
        startTime: Between(startDate, endDate),
        endTime: Between(startDate, endDate),
        status: In([
          BookingStatusEnum.WAIT_FOR_CONFIRMATION,
          BookingStatusEnum.BOOKING_CONFIRMED,
          BookingStatusEnum.COMPLETED,
          BookingStatusEnum.SERVICE_BOOKING_FORM_SUBMITED,
          BookingStatusEnum.SENDED_RESULT_SHEET,
        ]),
      },
      relations: {
        slot: true,
      },
    });
    return slots.map((slot) => {
      const isAvailable = !bookings.find(
        (booking) => booking.slot.id == slot.id
      );
      return { ...slot, isAvailable };
    });
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
      if (!bookingRequest.brandId)
        throw new BadRequestError('BrandId required');
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
      const brand = await brandRepository.findOne({
        where: { id: bookingRequest.brandId },
      });
      if (!brand) throw new BadRequestError('Brand not found');
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
      createdBooking.brand = brand;
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
