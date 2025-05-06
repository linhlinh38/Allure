import { In } from "typeorm";
import { Between, SelectQueryBuilder } from "typeorm";
import { AppDataSource } from "../dataSource";
import { BookingRequest } from "../dtos/request/booking.request";
import { Account } from "../entities/account.entity";
import { Booking } from "../entities/booking.entity";
import { BadRequestError } from "../errors/error";
import { bookingRepository } from "../repositories/booking.repository";
import { slotRepository } from "../repositories/slot.repository";
import {
  BookingStatusEnum,
  BookingTypeEnum,
  PaymentMethodEnum,
  ProductEnum,
  ReportStatusEnum,
  RoleEnum,
  ServiceTypeEnum,
  StatusEnum,
  TransactionTypeEnum,
} from "../utils/enum";
import { BaseService } from "./base.service";
import { accountRepository } from "../repositories/account.repository";
import { brandRepository } from "../repositories/brand.repository";
import { consultantServiceRepository } from "../repositories/consultantService.repository";
import { walletRepository } from "../repositories/wallet.reposirory";
import { StatusTracking } from "../entities/statusTracking.entity";
import { Wallet } from "../entities/wallet.entity";
import { Transaction } from "../entities/transaction.entity";
import { addBookingToQueue } from "../utils/queue/cancelBookingQueue";
import { ConsultationResult } from "../entities/consultationResult.entity";
import { BookingFormAnswer } from "../entities/bookingFormAnswer.entity";
import { ProductClassification } from "../entities/productClassification.entity";
import { walletService } from "./wallet.service";
import { transactionService } from "./transaction.service";
import { MediaFile } from "../entities/mediaFile.entity";
import { retrieveMasterConfig } from "../utils/retrieveMasterConfig";
import { addCompleteBookingToQueue } from "../utils/queue/completeBookingQueue";

const repository = AppDataSource.getRepository(Booking);

class BookingService extends BaseService<Booking> {
  async getBookingOfBrand(brandId: string) {
    const brand = await brandRepository.findOne({
      where: {
        id: brandId,
      },
    });
    if (!brand) throw new BadRequestError("Brand not found");
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
    if (!booking) throw new BadRequestError("Booking not found");
    return booking;
  }
  async getById(id: string) {
    const booking = await bookingRepository.findOne({
      where: {
        id,
      },
      relations: {
        brand: { reviewer: true },
        consultantService: {
          account: true,
          systemService: {
            consultationCriteria: { consultationCriteriaSections: true },
          },
          serviceBookingForm: { questions: { images: true } },
        },
        account: true,
        slot: true,
        bookingFormAnswer: true,
        consultationResult: true,
        statusTrackings: { mediaFiles: true, updatedBy: true },
        report: true,
        feedback: {
          mediaFiles: true,
          replies: {
            account: {
              role: true,
            },
          },
        },
      },
      order: {
        statusTrackings: {
          createdAt: "ASC",
        },
      },
    });
    if (!booking) throw new BadRequestError("Booking not found");
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
      throw new BadRequestError("Only reviewer can note result");
    booking.resultNote = resultNote;
    await repository.save(booking);
  }

  queryBuilderForBooking(queryBuilder: SelectQueryBuilder<any>) {
    queryBuilder
      .leftJoinAndSelect("booking.consultantService", "consultantService")
      .leftJoinAndSelect("consultantService.account", "consultant")
      .leftJoinAndSelect("consultantService.images", "consultantServiceImages");
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

  async getMyBookings(
    loginUser: string,
    statuses?: BookingStatusEnum[],
    searchQuery?: string
  ) {
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
          createdAt: "DESC",
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
          createdAt: "DESC",
        },
      });
    } else if (
      account.role.role == RoleEnum.MANAGER ||
      account.role.role == RoleEnum.CUSTOMER
    ) {
      // return await bookingRepository.find({
      //   where: {
      //     // type: BookingTypeEnum.INTERVIEW,
      //     account: { id: loginUser },
      //   },
      //   relations: {
      //     brand: { reviewer: true },
      //     consultantService: {
      //       account: true,
      //       systemService: true,
      //       serviceBookingForm: { questions: { images: true } },
      //     },
      //     account: true,
      //     slot: true,
      //     bookingFormAnswer: true,
      //     consultationResult: true,
      //     statusTrackings: true,
      //   },
      //   order: {
      //     createdAt: "DESC",
      //   },
      // });
      const queryBuilder = bookingRepository
        .createQueryBuilder("booking")
        .leftJoinAndSelect("booking.consultantService", "consultantService")
        .leftJoinAndSelect("consultantService.account", "consultantAccount")
        .leftJoinAndSelect("booking.account", "account")
        .select("booking")
        .addSelect("consultantService")
        .addSelect([
          "consultantAccount.id",
          "consultantAccount.username",
          "consultantAccount.email",
          "consultantAccount.firstName",
          "consultantAccount.lastName",
          "consultantAccount.avatar",
        ])
        .addSelect([
          "account.id",
          "account.username",
          "account.email",
          "account.phone",
          "account.firstName",
          "account.lastName",
          "account.avatar",
        ])
        .leftJoinAndSelect("consultantService.systemService", "systemService")
        .leftJoinAndSelect("consultantService.images", "images")
        .leftJoinAndSelect("booking.slot", "slot")
        .leftJoinAndSelect("booking.statusTrackings", "statusTrackings")
        .where("account.id = :loginUser", { loginUser });

      // Apply statuses filter
      if (statuses && statuses.length > 0) {
        queryBuilder.andWhere("booking.status IN (:...statuses)", {
          statuses,
        });
      }

      // Apply searchQuery filter
      if (searchQuery) {
        queryBuilder.andWhere("systemService.name LIKE :searchQuery", {
          searchQuery: `%${searchQuery}%`,
        });
      }

      queryBuilder.orderBy("booking.createdAt", "DESC");

      return await queryBuilder.getMany();
    } else if (account.role.role == RoleEnum.CONSULTANT) {
      // return await bookingRepository.find({
      //   where: {
      //     // type: BookingTypeEnum.INTERVIEW,
      //     consultantService: { account: { id: loginUser } },
      //   },
      //   relations: {
      //     brand: { reviewer: true },
      //     consultantService: {
      //       account: true,
      //       systemService: {
      //         consultationCriteria: { consultationCriteriaSections: true },
      //       },
      //       serviceBookingForm: true,
      //     },
      //     account: true,
      //     slot: true,
      //     bookingFormAnswer: true,
      //     consultationResult: true,
      //     statusTrackings: true,
      //   },
      //   order: {
      //     createdAt: "DESC",
      //   },
      // });

      const queryBuilder = bookingRepository
        .createQueryBuilder("booking")
        .leftJoinAndSelect("booking.consultantService", "consultantService")
        .leftJoinAndSelect("consultantService.account", "consultantAccount")
        .leftJoinAndSelect("booking.account", "account")
        .select("booking")
        .addSelect("consultantService")
        .addSelect([
          "consultantAccount.id",
          "consultantAccount.username",
          "consultantAccount.email",
          "consultantAccount.firstName",
          "consultantAccount.lastName",
          "consultantAccount.avatar",
        ])
        .addSelect([
          "account.id",
          "account.username",
          "account.email",
          "account.phone",
          "account.firstName",
          "account.lastName",
          "account.avatar",
        ])
        .leftJoinAndSelect("consultantService.systemService", "systemService")
        .leftJoinAndSelect("consultantService.images", "images")
        .leftJoinAndSelect("booking.slot", "slot")
        .leftJoinAndSelect("booking.statusTrackings", "statusTrackings")
        .where("consultantService.account.id = :loginUser", { loginUser });

      // Apply statuses filter
      if (statuses && statuses.length > 0) {
        queryBuilder.andWhere("booking.status IN (:...statuses)", {
          statuses,
        });
      }

      // Apply searchQuery filter
      if (searchQuery) {
        queryBuilder.andWhere("systemService.name LIKE :searchQuery", {
          searchQuery: `%${searchQuery}%`,
        });
      }

      queryBuilder.orderBy("booking.createdAt", "DESC");

      return await queryBuilder.getMany();
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
      throw new BadRequestError("Only apply for consultant or operator");
    }

    // Lấy danh sách các ngày trong tuần từ startDate đến endDate
    const weekDays = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      // Lấy ngày trong tuần (2-8, trong đó 2 là thứ 2, 8 là chủ nhật)
      const weekDay = currentDate.getDay() === 0 ? 8 : currentDate.getDay() + 1;
      weekDays.push(weekDay);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Lọc working slots theo weekDay
    const filteredSlots = account.workingSlots.filter((slot) =>
      weekDays.includes(slot.weekDay)
    );

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

    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();

    return filteredSlots
      .filter((slot) => {
        // Nếu slot là ngày hôm nay, kiểm tra giờ
        if (slot.weekDay === currentTime.getDay() + 1) {
          const slotHour = parseInt(slot.startTime.split(":")[0]);
          const slotMinute = parseInt(slot.startTime.split(":")[1]);

          // Nếu slot đã qua giờ hiện tại thì bỏ qua
          if (
            slotHour < currentHour ||
            (slotHour === currentHour && slotMinute <= currentMinute)
          ) {
            return false;
          }
        }
        return true;
      })
      .map((slot) => {
        const isAvailable = !bookings.find(
          (booking) => booking.slot.id == slot.id
        );
        return { ...slot, isAvailable };
      });
  }

  async filterBookings(
    loginUser: string,
    filters: {
      consultantServiceId?: string;
      consultantAccountId?: string;
      systemServiceType?: ServiceTypeEnum;
      type?: BookingTypeEnum;
      status?: BookingStatusEnum[];
      minTotalPrice?: number;
      maxTotalPrice?: number;
      feedbackRating?: number;
    },
    paging: { page: number; limit: number },
    sortBy: keyof Booking = "createdAt",
    order: "ASC" | "DESC" = "ASC"
  ): Promise<{
    items: Booking[];
    total: number;
    page: number;
    limit: number;
  }> {
    const account = await accountRepository.findOne({
      where: { id: loginUser },
      relations: {
        role: true,
      },
    });
    const queryBuilder = repository
      .createQueryBuilder("booking")
      .leftJoinAndSelect("booking.consultantService", "consultantService")
      .leftJoinAndSelect("consultantService.account", "consultantAccount")
      .leftJoinAndSelect("booking.account", "account")
      .select("booking")
      .addSelect("consultantService")
      .addSelect([
        "consultantAccount.id",
        "consultantAccount.username",
        "consultantAccount.email",
        "consultantAccount.phone",
        "consultantAccount.firstName",
        "consultantAccount.lastName",
        "consultantAccount.avatar",
      ])
      .addSelect([
        "account.id",
        "account.username",
        "account.email",
        "account.phone",
        "account.firstName",
        "account.lastName",
        "account.avatar",
      ])
      .leftJoinAndSelect("consultantService.systemService", "systemService")
      .leftJoinAndSelect("systemService.images", "images")
      .leftJoinAndSelect("booking.feedback", "feedback");

    // Filter by consultantServiceId
    if (filters.consultantServiceId) {
      queryBuilder.andWhere("consultantService.id = :consultantServiceId", {
        consultantServiceId: filters.consultantServiceId,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere("booking.type = :type", {
        type: filters.type,
      });
    }

    if (account.role.role == RoleEnum.CONSULTANT) {
      queryBuilder.andWhere("consultantAccount.id = :loginUser", {
        loginUser,
      });
    }
    // Filter by consultantAccountId
    else if (filters.consultantAccountId) {
      queryBuilder.andWhere("consultantAccount.id = :consultantAccountId", {
        consultantAccountId: filters.consultantAccountId,
      });
    }

    // Filter by systemServiceType
    if (filters.systemServiceType) {
      queryBuilder.andWhere("systemService.type = :systemServiceType", {
        systemServiceType: filters.systemServiceType,
      });
    }

    // Filter by status
    if (filters.status && filters.status.length > 0) {
      queryBuilder.andWhere("booking.status IN (:...status)", {
        status: filters.status,
      });
    }

    // Filter by totalPrice range
    if (filters.minTotalPrice) {
      queryBuilder.andWhere("booking.totalPrice >= :minTotalPrice", {
        minTotalPrice: filters.minTotalPrice,
      });
    }
    if (filters.maxTotalPrice) {
      queryBuilder.andWhere("booking.totalPrice <= :maxTotalPrice", {
        maxTotalPrice: filters.maxTotalPrice,
      });
    }

    // Filter by feedback rating
    if (filters.feedbackRating) {
      queryBuilder.andWhere("feedback.rating = :feedbackRating", {
        feedbackRating: filters.feedbackRating,
      });
    }

    // Sorting and pagination
    queryBuilder
      .orderBy(`booking.${sortBy}`, order)
      .skip((paging.page - 1) * paging.limit)
      .take(paging.limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page: paging.page,
      limit: paging.limit,
    };
  }

  async calculateRevenueByConsultant(
    consultantId: string,
    startTime: string,
    endTime: string
  ): Promise<number> {
    const totalRevenue = await repository
      .createQueryBuilder("booking")
      .select("SUM(booking.totalPrice)", "totalRevenue")
      .leftJoin("booking.consultantService", "consultantService")
      .where("consultantService.account.id = :consultantId", { consultantId })
      .andWhere("booking.status = :status", {
        status: BookingStatusEnum.COMPLETED,
      })
      .andWhere("booking.createdAt >= :startTime", { startTime })
      .andWhere("booking.createdAt <= :endTime", { endTime })
      .getRawOne();

    return totalRevenue?.totalRevenue || 0;
  }

  async updateStatus(id: string, status: BookingStatusEnum) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const booking = await bookingRepository.findOne({
        where: {
          id,
        },
      });
      if (!booking) throw new BadRequestError("Booking not found");
      booking.status = status;
      if (
        status === BookingStatusEnum.COMPLETED &&
        booking.type == BookingTypeEnum.SERVICE
      ) {
        await transactionService.transferToConsultantWallet(
          booking.id,
          queryRunner
        );
      }
      await queryRunner.manager.save(booking);
      await queryRunner.commitTransaction();
      return { message: "Booking service status updated successfully" };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateBookingServiceStatus(id: string, data: any, loginUser: string) {
    const masterConfig = await retrieveMasterConfig();
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the booking
      const booking = await bookingRepository.findOne({
        where: { id },
        relations: [
          "account",
          "consultantService",
          "consultantService.systemService",
          "report",
        ],
      });

      if (!booking) {
        throw new BadRequestError("Booking not found");
      }

      let statusTracking;

      if (
        data.bookingFormAnswer &&
        data.status === BookingStatusEnum.SERVICE_BOOKING_FORM_SUBMITED
      ) {
        let serviceBookingFormAnswer = new BookingFormAnswer();
        serviceBookingFormAnswer.booking = booking;
        serviceBookingFormAnswer.serviceBookingForm = {
          id: data.bookingFormAnswer.formId,
        } as any;
        serviceBookingFormAnswer.form = data.bookingFormAnswer.form;
        serviceBookingFormAnswer.answers = data.bookingFormAnswer.answers;
        serviceBookingFormAnswer = await queryRunner.manager.save(
          BookingFormAnswer,
          serviceBookingFormAnswer
        );

        // Update booking status to SERVICE_BOOKING_FORM_SUBMITED
        booking.status = BookingStatusEnum.SERVICE_BOOKING_FORM_SUBMITED;
        booking.bookingFormAnswer = serviceBookingFormAnswer;
        await queryRunner.manager.save(Booking, booking);

        // Create a status tracking record
        statusTracking = this.updateBookingStatus(
          booking,
          BookingStatusEnum.SERVICE_BOOKING_FORM_SUBMITED,
          loginUser,
          "Service booking form submitted"
        );
        await queryRunner.manager.save(StatusTracking, statusTracking);

        let delay = masterConfig.expiredBookinFormSubmited;
        if (
          booking.consultantService.systemService.type ===
          ServiceTypeEnum.PREMIUM
        ) {
          const bookingEndTime = new Date(booking.endTime);
          const now = new Date();
          // Calculate the difference in milliseconds
          delay =
            bookingEndTime.getTime() - now.getTime() + 24 * 60 * 60 * 1000;
        }
        await addBookingToQueue(
          booking.id,
          delay,
          BookingStatusEnum.SERVICE_BOOKING_FORM_SUBMITED
        );
      } else if (data.consultationResult) {
        if (data.consultationResult.suggestedProductClassifications) {
          for (const suggestedProductClassification of data.consultationResult
            .suggestedProductClassifications) {
            const checkClassification = await queryRunner.manager.findOne(
              ProductClassification,
              {
                where: {
                  id: suggestedProductClassification.productClassificationId,
                  status: StatusEnum.ACTIVE,
                },
                relations: {
                  product: true,
                },
              }
            );
            if (!checkClassification)
              throw new BadRequestError("Product not found");
            if (
              !checkClassification.product ||
              checkClassification.product.status === ProductEnum.BANNED
            )
              throw new BadRequestError("Please select active product");
          }
        }
        let consultationResult = new ConsultationResult();
        consultationResult.booking = booking;
        consultationResult.consultationCriteria = {
          id: data.consultationResult.criteriaId,
        } as any;
        consultationResult.criteria = data.consultationResult.criteria;
        consultationResult.results = data.consultationResult.results;
        consultationResult.suggestedProductClassifications =
          data.consultationResult.suggestedProductClassifications;
        consultationResult = await queryRunner.manager.save(
          ConsultationResult,
          consultationResult
        );

        // Update booking status to SENDED_RESULT_SHEET
        booking.status = BookingStatusEnum.SENDED_RESULT_SHEET;
        booking.consultationResult = consultationResult;
        await queryRunner.manager.save(Booking, booking);

        // Create a status tracking record
        statusTracking = this.updateBookingStatus(
          booking,
          BookingStatusEnum.SENDED_RESULT_SHEET,
          loginUser,
          "Consultation result sent"
        );
        await queryRunner.manager.save(StatusTracking, statusTracking);
        await addCompleteBookingToQueue(booking.id, 2592000000);
      } else if (data.status === BookingStatusEnum.COMPLETED_CONSULTING_CALL) {
        if (data.note) {
          booking.resultNote = data.note;
        }
        booking.status = data.status;
        await queryRunner.manager.save(Booking, booking);
        statusTracking = this.updateBookingStatus(
          booking,
          BookingStatusEnum.COMPLETED_CONSULTING_CALL,
          loginUser,
          "Booking status updated"
        );
        statusTracking = await queryRunner.manager.save(
          StatusTracking,
          statusTracking
        );
        if (data.mediaFiles && data.mediaFiles.length > 0) {
          for (const file of data.mediaFiles) {
            const mediaFile = new MediaFile();
            mediaFile.fileUrl = file.fileUrl;
            mediaFile.statusTracking = statusTracking;
            await queryRunner.manager.save(MediaFile, mediaFile);
          }
        }

        await addBookingToQueue(
          booking.id,
          masterConfig.expiredBookinCompletedCall,
          BookingStatusEnum.COMPLETED_CONSULTING_CALL
        );
      } else {
        booking.status = data.status;
        if (data.meetUrl) {
          booking.meetUrl = data.meetUrl;
        }
        if (
          data.status === BookingStatusEnum.COMPLETED &&
          booking.type == BookingTypeEnum.SERVICE &&
          booking.report &&
          booking.report.status !== ReportStatusEnum.REJECTED &&
          booking.report.status !== ReportStatusEnum.CANCELLED
        ) {
          throw new BadRequestError(
            "You cannot complete the booking because the report has not been completed yet."
          );
        }

        await queryRunner.manager.save(Booking, booking);

        statusTracking = this.updateBookingStatus(
          booking,
          data.status,
          loginUser,
          "Booking status updated"
        );
        await queryRunner.manager.save(StatusTracking, statusTracking);
        if (data.status === BookingStatusEnum.BOOKING_CONFIRMED) {
          let delay = masterConfig.expiredBookingConfirmed;
          if (
            booking.consultantService.systemService.type ===
            ServiceTypeEnum.PREMIUM
          ) {
            const bookingStartTime = new Date(booking.startTime);
            const now = new Date();

            // Subtract 15 minutes (15 * 60 * 1000 milliseconds) from now
            const nowMinus15Minutes = new Date(now.getTime() + 15 * 60 * 1000);

            // Calculate the difference in milliseconds
            delay = bookingStartTime.getTime() - nowMinus15Minutes.getTime();
          }
          await addBookingToQueue(
            booking.id,
            delay,
            BookingStatusEnum.BOOKING_CONFIRMED
          );
        }
        if (
          data.status === BookingStatusEnum.COMPLETED &&
          booking.type == BookingTypeEnum.SERVICE
        ) {
          await transactionService.transferToConsultantWallet(
            booking.id,
            queryRunner
          );
        }
      }

      await queryRunner.commitTransaction();
      return { message: "Booking service status updated successfully" };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
      if (existedBooking) throw new BadRequestError("Slot has been booked");
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
            BookingStatusEnum.TO_PAY,
            BookingStatusEnum.BOOKING_CONFIRMED,
            BookingStatusEnum.WAIT_FOR_CONFIRMATION,
          ]),
        },
      });
      if (existedBooking) throw new BadRequestError("Slot has been booked");
    }
  }

  async createBooking(bookingRequest: BookingRequest, loginUser: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    const masterConfig = await retrieveMasterConfig();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let createdBooking: Booking;
    try {
      // const bookings = await repository.find({
      //   where: { account: { id: loginUser } },
      //   relations: ["slot"],
      //   order: { createdAt: "DESC" },
      //   take: 1,
      // });
      // const booking = bookings[0];
      // if (
      //   booking &&
      //   booking.type === BookingTypeEnum.INTERVIEW &&
      //   booking.status == BookingStatusEnum.WAIT_FOR_CONFIRMATION
      // )
      //   throw new BadRequestError(
      //     "You have already booked a slot. Please wait for process"
      //   );
      if (bookingRequest.slot) {
        const slot = await slotRepository.findOneBy({
          id: bookingRequest.slot,
        });
        if (!slot || !slot.isActive)
          throw new BadRequestError("Slot not found or invalid");
      }

      if (bookingRequest.type == BookingTypeEnum.INTERVIEW) {
        if (!bookingRequest.brandId)
          throw new BadRequestError("BrandId required");
        const brand = await brandRepository.findOne({
          where: { id: bookingRequest.brandId },
        });
        if (!brand) throw new BadRequestError("Brand not found");

        const bookings = await repository.find({
          where: {
            account: { id: loginUser },
            type: BookingTypeEnum.INTERVIEW,
          },
          relations: ["slot"],
          order: { createdAt: "DESC" },
          take: 1,
        });
        const booking = bookings && bookings.length > 0 && bookings[0];
        if (
          booking &&
          booking.status == BookingStatusEnum.WAIT_FOR_CONFIRMATION
        )
          throw new BadRequestError(
            "You have already booked a slot. Please wait for process"
          );
        await this.isSlotBooked(bookingRequest);

        const createdBooking = new Booking();
        Object.assign(createdBooking, bookingRequest);
        createdBooking.status = BookingStatusEnum.WAIT_FOR_CONFIRMATION;
        createdBooking.account = new Account();
        createdBooking.account.id = loginUser;
        createdBooking.brand = brand;
        await queryRunner.manager.save(Booking, createdBooking);
      } else {
        if (!bookingRequest.consultantService)
          throw new BadRequestError("ConsultantServiceId required");
        const consultantService = await consultantServiceRepository.findOne({
          where: { id: bookingRequest.consultantService },
          relations: {
            systemService: true,
          },
        });
        if (!consultantService)
          throw new BadRequestError("ConsultantService not found");
        if (
          consultantService.systemService.type === ServiceTypeEnum.PREMIUM &&
          !bookingRequest.slot
        ) {
          throw new BadRequestError("Slot is required");
        }
        if (bookingRequest.slot) await this.isSlotBooked(bookingRequest);

        createdBooking = new Booking();
        Object.assign(createdBooking, bookingRequest);
        createdBooking.status = BookingStatusEnum.TO_PAY;
        createdBooking.account = new Account();
        createdBooking.account.id = loginUser;
        createdBooking.consultantService = consultantService;

        createdBooking = await queryRunner.manager.save(
          Booking,
          createdBooking
        );

        createdBooking = await queryRunner.manager.findOne(Booking, {
          where: {
            id: createdBooking.id,
          },
          relations: [
            "account",
            "consultantService",
            "consultantService.systemService",
            "consultantService.account",
            "slot",
          ],
        });
        const masterConfig = await retrieveMasterConfig();
        createdBooking.commissionFee =
          createdBooking.totalPrice * masterConfig.commissionFee;

        let statusTrackings;
        let transaction;
        if (createdBooking.paymentMethod === PaymentMethodEnum.WALLET) {
          const wallet = await walletRepository.findOne({
            where: {
              owner: { id: loginUser },
            },
          });
          if (!wallet || wallet.availableBalance < createdBooking.totalPrice) {
            statusTrackings = this.updateBookingStatus(
              createdBooking,
              BookingStatusEnum.TO_PAY,
              loginUser
            );
          } else {
            walletService.decreaseBalance(wallet, createdBooking.totalPrice);
            await queryRunner.manager.save(Wallet, wallet);

            createdBooking.status = BookingStatusEnum.WAIT_FOR_CONFIRMATION;

            await queryRunner.manager.update(
              Booking,
              { id: createdBooking.id },
              { status: BookingStatusEnum.WAIT_FOR_CONFIRMATION }
            );

            statusTrackings = this.updateBookingStatus(
              createdBooking,
              BookingStatusEnum.WAIT_FOR_CONFIRMATION,
              loginUser
            );

            transaction = this.createBookingTransaction(
              createdBooking,
              wallet.balance,
              TransactionTypeEnum.BOOKING_PURCHASE
            );
            await queryRunner.manager.save(Transaction, transaction);
          }
        }
        if (createdBooking.paymentMethod == PaymentMethodEnum.BANK_TRANSFER) {
          statusTrackings = this.updateBookingStatus(
            createdBooking,
            BookingStatusEnum.TO_PAY,
            loginUser
          );
        }
        await queryRunner.manager.save(StatusTracking, statusTrackings);

        if (createdBooking.status === BookingStatusEnum.TO_PAY) {
          await addBookingToQueue(
            createdBooking.id,
            masterConfig.expiredBookingToPay,
            BookingStatusEnum.TO_PAY
          );
        }
        let delay = masterConfig.expiredBookingWaitForConfirm;
        if (
          createdBooking.consultantService.systemService.type ===
          ServiceTypeEnum.PREMIUM
        ) {
          const bookingStartTime = new Date(createdBooking.startTime);
          const now = new Date();

          // Subtract 30 minutes (30 * 60 * 1000 milliseconds) from now
          const nowMinus30Minutes = new Date(now.getTime() + 30 * 60 * 1000);

          // Calculate the difference in milliseconds
          delay = bookingStartTime.getTime() - nowMinus30Minutes.getTime();

          delay =
            delay > masterConfig.expiredBookingWaitForConfirm
              ? masterConfig.expiredBookingWaitForConfirm
              : delay;
        }
        if (createdBooking.status === BookingStatusEnum.WAIT_FOR_CONFIRMATION) {
          await addBookingToQueue(
            createdBooking.id,
            delay,
            BookingStatusEnum.WAIT_FOR_CONFIRMATION
          );
        }
      }
      await queryRunner.commitTransaction();
      return createdBooking;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelBooking(
    bookingId: string,
    loginUser?: string,
    reason?: string,
    notRefund?: boolean
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Find the booking
      const booking = await bookingRepository.findOne({
        where: { id: bookingId },
        relations: [
          "account",
          "consultantService",
          "consultantService.account",
          "slot",
        ],
      });

      if (loginUser) {
        const user = await accountRepository.findOne({
          where: { id: loginUser },
          relations: ["role"],
        });
      }

      if (!booking) {
        throw new BadRequestError("Booking not found");
      }

      if (
        //user.role.role === RoleEnum.CUSTOMER &&
        booking.status !== BookingStatusEnum.TO_PAY &&
        booking.status !== BookingStatusEnum.WAIT_FOR_CONFIRMATION &&
        booking.status !== BookingStatusEnum.BOOKING_CONFIRMED &&
        booking.status !== BookingStatusEnum.SERVICE_BOOKING_FORM_SUBMITED &&
        booking.status !== BookingStatusEnum.COMPLETED_CONSULTING_CALL &&
        booking.status !== BookingStatusEnum.SENDED_RESULT_SHEET
      ) {
        throw new BadRequestError("Can not cancelled booking in status: ");
      }
      // Update the booking status to CANCELLED
      await queryRunner.manager.update(
        Booking,
        { id: bookingId },
        { status: BookingStatusEnum.CANCELLED }
      );

      const statusTracking = this.updateBookingStatus(
        booking,
        BookingStatusEnum.CANCELLED,
        loginUser,
        reason
      );
      await queryRunner.manager.save(StatusTracking, statusTracking);
      if (
        booking.status !== BookingStatusEnum.TO_PAY &&
        booking.status !== BookingStatusEnum.BOOKING_CONFIRMED &&
        (booking.status !== BookingStatusEnum.SERVICE_BOOKING_FORM_SUBMITED ||
          !notRefund)
      ) {
        const wallet = await walletRepository.findOne({
          where: {
            owner: { id: booking.account.id },
          },
        });
        if (!wallet) throw new BadRequestError("Dont have wallet");

        walletService.increaseBalance(wallet, booking.totalPrice);
        await queryRunner.manager.save(Wallet, wallet);

        const transaction = this.createBookingTransaction(
          booking,
          wallet.balance,
          TransactionTypeEnum.BOOKING_CANCEL
        );
        await queryRunner.manager.save(Transaction, transaction);
      }

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
    updatedBy?: string,
    reason?: string
  ) {
    let statusTracking = new StatusTracking();
    statusTracking.booking = booking;
    statusTracking.updatedBy = new Account();
    statusTracking.updatedBy.id = updatedBy;
    statusTracking.status = status;
    statusTracking.reason = reason ?? null;
    return statusTracking;
  }

  createBookingTransaction(
    booking: Booking,
    balance: number,
    type: TransactionTypeEnum
  ) {
    let transaction = new Transaction();
    transaction.booking = booking;
    transaction.buyer = booking.account;
    transaction.amount = booking.totalPrice;
    transaction.balanceAfterTransaction = balance;
    transaction.consultant = booking.consultantService.account;
    transaction.type = type;
    transaction.paymentMethod = booking.paymentMethod;
    return transaction;
  }

  async getStatusBookingInterview(loginUser: string) {
    const bookings = await repository.find({
      where: { account: { id: loginUser } },
      relations: ["slot"],
      order: { createdAt: "DESC" },
      take: 1,
    });
    const booking = bookings[0];
    if (!booking) throw new BadRequestError("Booking not found");
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
