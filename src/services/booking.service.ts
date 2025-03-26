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
import { consultantServiceRepository } from '../repositories/consultantService.repository';

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
    } else if (
      account.role.role == RoleEnum.MANAGER ||
      account.role.role == RoleEnum.CUSTOMER
    ) {
      return await bookingRepository.find({
        where: {
          // type: BookingTypeEnum.INTERVIEW,
          account: { id: loginUser },
        },
        relations: {
          brand: { reviewer: true },
          consultantService: { account: true },
          account: true,
          slot: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    } else if (account.role.role == RoleEnum.CONSULTANT) {
      return await bookingRepository.find({
        where: {
          // type: BookingTypeEnum.INTERVIEW,
          consultantService: { account: { id: loginUser } },
        },
        relations: {
          brand: { reviewer: true },
          consultantService: { account: true },
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

  async isSlotBooked(bookingRequest: BookingRequest) {
    if (bookingRequest.type == BookingTypeEnum.INTERVIEW) {
      const brand = await brandRepository.findOne({
        where: {
          id: bookingRequest.brandId,
        },
        relations: {
          reviewer: true,
        },
      });
      const reviewer = brand.reviewer;
      const existedBooking = await bookingRepository.findOne({
        where: {
          brand: { reviewer: { id: reviewer.id } },
          slot: { id: bookingRequest.slot },
          startTime: bookingRequest.startTime,
          endTime: bookingRequest.endTime,
          status: In([
            BookingStatusEnum.BOOKING_CONFIRMED,
            BookingStatusEnum.WAIT_FOR_CONFIRMATION,
          ]),
        },
      });
      if (existedBooking) throw new BadRequestError('Slot has been booked');
    } else {
      const consultantService = await consultantServiceRepository.findOne({
        where: {
          id: bookingRequest.consultantService,
        },
        relations: {
          account: true,
        },
      });
      const consultant = consultantService.account;
      const existedBooking = await bookingRepository.findOne({
        where: {
          consultantService: { account: { id: consultant.id } },
          slot: { id: bookingRequest.slot },
          startTime: bookingRequest.startTime,
          endTime: bookingRequest.endTime,
          status: In([
            BookingStatusEnum.BOOKING_CONFIRMED,
            BookingStatusEnum.WAIT_FOR_CONFIRMATION,
          ]),
        },
      });
      if (existedBooking) throw new BadRequestError('Slot has been booked');
    }
  }

  async createBooking(bookingRequest: BookingRequest, loginUser: string) {
    const slot = await slotRepository.findOneBy({ id: bookingRequest.slot });
    if (!slot) throw new BadRequestError('Slot not found');

    const existedBooking = await bookingRepository.findOne({
      where: {
        slot: { id: bookingRequest.slot },
        startTime: bookingRequest.startTime,
        endTime: bookingRequest.endTime,
        status: In([
          BookingStatusEnum.BOOKING_CONFIRMED,
          BookingStatusEnum.WAIT_FOR_CONFIRMATION,
        ]),
      },
    });
    if (existedBooking) throw new BadRequestError('Slot has been booked');

    if (bookingRequest.type == BookingTypeEnum.INTERVIEW) {
      if (!bookingRequest.brandId)
        throw new BadRequestError('BrandId required');
      const brand = await brandRepository.findOne({
        where: { id: bookingRequest.brandId },
      });
      if (!brand) throw new BadRequestError('Brand not found');

      const bookings = await repository.find({
        where: { account: { id: loginUser }, type: BookingTypeEnum.INTERVIEW },
        relations: ['slot'],
        order: { createdAt: 'DESC' },
        take: 1,
      });
      const booking = bookings && bookings.length > 0 && bookings[0];
      if (booking && booking.status == BookingStatusEnum.WAIT_FOR_CONFIRMATION)
        throw new BadRequestError(
          'You have already booked a slot. Please wait for process'
        );
      await this.isSlotBooked(bookingRequest);

      const createdBooking = new Booking();
      Object.assign(createdBooking, bookingRequest);
      createdBooking.status = BookingStatusEnum.WAIT_FOR_CONFIRMATION;
      createdBooking.account = new Account();
      createdBooking.account.id = loginUser;
      createdBooking.brand = brand;
      await createdBooking.save();
      return;
    } else {
      if (!bookingRequest.consultantService)
        throw new BadRequestError('ConsultantServiceId required');
      const consultantService = await consultantServiceRepository.findOne({
        where: { id: bookingRequest.consultantService },
      });
      if (!consultantService)
        throw new BadRequestError('ConsultantService not found');

      await this.isSlotBooked(bookingRequest);

        let createdBooking = new Booking();
        Object.assign(createdBooking, bookingRequest);
        createdBooking.status = BookingStatusEnum.TO_PAY;
        createdBooking.account = new Account();
        createdBooking.account.id = loginUser;
        createdBooking.consultantService = consultantService;

        createdBooking = await queryRunner.manager.save(
          Booking,
          createdBooking
        );

        let statusTrackings;
        let transaction;
        if (createdBooking.paymentMethod === PaymentMethodEnum.WALLET) {
          const wallet = await walletRepository.findOne({
            where: {
              owner: { id: loginUser },
            },
          });
          if (!wallet || wallet.balance < createdBooking.totalPrice) {
            statusTrackings = await this.updateBookingStatus(
              createdBooking,
              BookingStatusEnum.TO_PAY
            );
          } else {
            wallet.balance -= createdBooking.totalPrice;
            await queryRunner.manager.save(Wallet, wallet);
            await queryRunner.manager.update(
              Booking,
              { id: createdBooking.id },
              { status: BookingStatusEnum.WAIT_FOR_CONFIRMATION }
            );
            statusTrackings = this.updateBookingStatus(
              createdBooking,
              BookingStatusEnum.WAIT_FOR_CONFIRMATION
            );
          }
          transaction = this.createBookingTransaction(
            createdBooking,
            TransactionTypeEnum.BOOKING_PURCHASE
          );
          await queryRunner.manager.save(Transaction, transaction);
        }
        if (createdBooking.paymentMethod == PaymentMethodEnum.BANK_TRANSFER) {
          statusTrackings = this.updateBookingStatus(
            createdBooking,
            BookingStatusEnum.TO_PAY
          );
        }
        await queryRunner.manager.save(StatusTracking, statusTrackings);
      }
      await queryRunner.commitTransaction();
      return;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelBooking(bookingId: string, loginUser: string, reason?: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the booking
      const booking = await bookingRepository.findOne({
        where: { id: bookingId },
        relations: ["account"],
      });

      const user = await accountRepository.findOne({
        where: { id: loginUser },
        relations: ["role"],
      });

      if (!booking) {
        throw new BadRequestError("Booking not found");
      }

      if (
        //user.role.role === RoleEnum.CUSTOMER &&
        booking.status !== BookingStatusEnum.TO_PAY &&
        booking.status !== BookingStatusEnum.WAIT_FOR_CONFIRMATION
      ) {
        throw new BadRequestError(
          `Can not cancelled booking in status: ${booking.status}`
        );
      }

      // Update the booking status to CANCELLED
      booking.status = BookingStatusEnum.CANCELLED;
      await queryRunner.manager.save(Booking, booking);

      const statusTracking = this.updateBookingStatus(
        booking,
        BookingStatusEnum.CANCELLED,
        reason
      );
      await queryRunner.manager.save(StatusTracking, statusTracking);

      const wallet = await walletRepository.findOne({
        where: {
          owner: { id: booking.account.id },
        },
      });
      if (!wallet) throw new BadRequestError("Dont have wallet");
      wallet.balance += booking.totalPrice;
      await queryRunner.manager.save(Wallet, wallet);

      const transaction = this.createBookingTransaction(
        booking,
        TransactionTypeEnum.BOOKING_CANCEL
      );
      await queryRunner.manager.save(Transaction, transaction);

      await queryRunner.commitTransaction();

      return { message: "Booking cancelled successfully" };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  updateBookingStatus(
    booking: Booking,
    status: BookingStatusEnum,
    reason?: string
  ) {
    let statusTracking = new StatusTracking();
    statusTracking.booking = booking;
    statusTracking.updatedBy = new Account();
    statusTracking.updatedBy.id = booking.account.id;
    statusTracking.status = status;
    statusTracking.reason = reason ?? null;
    return statusTracking;
  }

  createBookingTransaction(booking: Booking, type: TransactionTypeEnum) {
    let transaction = new Transaction();
    transaction.booking = booking;
    transaction.buyer = booking.account;
    transaction.amount = booking.totalPrice;
    transaction.consultant = booking.consultantService.account;
    transaction.type = type;
    transaction.paymentMethod = booking.paymentMethod;
    return transaction;
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
