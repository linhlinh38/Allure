import { Report } from './../entities/report.entity';
import { AppDataSource } from '../dataSource';
import {
  CreateReportRequest,
  FilterReportsRequest,
} from '../dtos/request/report.request';
import { BaseService } from './base.service';
import { File } from '../entities/file.entity';
import { Account } from '../entities/account.entity';
import {
  BookingStatusEnum,
  ReportStatusEnum,
  ReportTypeEnum,
  RoleEnum,
} from '../utils/enum';
import { bookingRepository } from '../repositories/booking.repository';
import { BadRequestError } from '../errors/error';
import { orderRepository } from '../repositories/order.repository';
import { accountRepository } from '../repositories/account.repository';
import { orderService } from './order.service';
import { bookingService } from './booking.service';
import { Paging } from '../dtos/other/paging.dto';
import { transactionService } from './transaction.service';
import { Booking } from '../entities/booking.entity';
import { StatusTracking } from '../entities/statusTracking.entity';

const repository = AppDataSource.getRepository(Report);
class ReportService extends BaseService<Report> {
  async getById(id: string) {
    const report = await repository.findOne({
      where: { id: id },
      relations: {
        assignee: true,
        reporter: true,
        files: true,
        order: {
          orderDetails: {
            feedback: true,
            productClassification: {
              images: true,
              product: { brand: true, images: true },
              productDiscount: { product: { brand: true, images: true } },
              preOrderProduct: { product: { brand: true, images: true } },
            },
          },
        },
        booking: {
          consultantService: {
            account: true,
            systemService: true,
          },
        },
      },
    });
    if (!report) throw new BadRequestError('Report not found');
    return report;
  }
  async noteResult(id: string, resultNote: string, loginUser: string) {
    const report = await repository.findOne({
      where: { id: id },
      relations: {
        assignee: true,
      },
    });
    if (!report) throw new BadRequestError(`Report not found`);
    if (!report.assignee || report.assignee.id != loginUser)
      throw new BadRequestError('Only assignee can note result');
    report.resultNote = resultNote;
    await repository.save(report);
  }

  async updateStatus(id: string, status: ReportStatusEnum) {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const reportRepository = queryRunner.manager.getRepository(Report);
      const bookingRepository = queryRunner.manager.getRepository(Booking);
      const statusTrackingRepository =
        queryRunner.manager.getRepository(StatusTracking);
      const report = await reportRepository.findOne({
        where: { id: id },
        relations: { booking: true },
      });
      if (!report) throw new BadRequestError(`Report not found`);
      report.status = status;
      await queryRunner.manager.save(report);

      if (
        report.booking &&
        report.type == ReportTypeEnum.BOOKING &&
        report.status == ReportStatusEnum.APPROVED &&
        report.booking.status !== BookingStatusEnum.CANCELLED
      ) {
        await bookingService.cancelBooking(
          report.booking.id,
          null,
          'Tự động hủy do khiếu nại đã được duyệt',
          false
        );
      }

      if (
        report.booking &&
        report.type == ReportTypeEnum.BOOKING &&
        (report.status == ReportStatusEnum.REJECTED ||
          report.status == ReportStatusEnum.CANCELLED) &&
        report.booking.status === BookingStatusEnum.SENDED_RESULT_SHEET
      ) {
        const statusTracking = bookingService.updateBookingStatus(
          report.booking,
          BookingStatusEnum.COMPLETED,
          null,
          'Tự động hoàn thành do khiếu nại đã bị từ chối'
        );
        await bookingRepository.update(report.booking.id, {
          status: BookingStatusEnum.COMPLETED,
        });
        await statusTrackingRepository.save(statusTracking);

        await transactionService.transferToConsultantWallet(
          report.booking.id,
          queryRunner
        );
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async assign(reportId: string, assigneeId: string) {
    const report = await repository.findOne({
      where: { id: reportId },
      relations: {
        assignee: true,
      },
    });
    if (!report) throw new BadRequestError(`Report not found`);
    if (
      report.status == ReportStatusEnum.APPROVED ||
      report.status == ReportStatusEnum.REJECTED
    )
      throw new BadRequestError(`Report is done. Can not assign`);
    if (report.assignee?.id == assigneeId) return;
    const assignee = await accountRepository.findOneBy({ id: assigneeId });
    if (!assignee) throw new BadRequestError(`Assignee not found`);
    report.assignee = assignee;
    await report.save();
  }

  async createReport(
    createReportRequest: CreateReportRequest,
    loginUser: string
  ) {
    const report = new Report();
    Object.assign(report, createReportRequest);
    delete report.files;
    if (createReportRequest.files && createReportRequest.files.length > 0) {
      report.files = createReportRequest.files.map((file) => {
        const fileEntity = new File();
        fileEntity.fileUrl = file;
        return fileEntity;
      });
    }
    report.reporter = new Account();
    report.reporter.id = loginUser;
    if (report.type == ReportTypeEnum.BOOKING) {
      if (!createReportRequest.bookingId)
        throw new BadRequestError('Booking id required');
      const booking = await bookingRepository.findOne({
        where: {
          id: createReportRequest.bookingId,
        },
      });
      if (!booking) {
        throw new BadRequestError('Booking not found');
      }

      const allowedStatuses = [
        BookingStatusEnum.SERVICE_BOOKING_FORM_SUBMITED,
        BookingStatusEnum.COMPLETED_CONSULTING_CALL,
        BookingStatusEnum.SENDED_RESULT_SHEET,
      ];

      if (!allowedStatuses.includes(booking.status)) {
        throw new BadRequestError(
          `Cannot create a report for booking due to current status`
        );
      }

      if (booking.status === BookingStatusEnum.SENDED_RESULT_SHEET) {
        const updatedAt = new Date(booking.updatedAt);
        const now = new Date();
        const twoDaysInMilliseconds = 2 * 24 * 60 * 60 * 1000;

        if (now.getTime() - updatedAt.getTime() > twoDaysInMilliseconds) {
          throw new BadRequestError(
            'Cannot create a report for this booking. The 2-day time limit has passed.'
          );
        }
      }

      const existedBookingReport = await repository.findOne({
        where: {
          booking: { id: createReportRequest.bookingId },
          reporter: { id: loginUser },
        },
      });
      if (existedBookingReport)
        throw new BadRequestError('Only report once for this booking');
      report.booking = booking;
    } else if (report.type == ReportTypeEnum.ORDER) {
      if (!createReportRequest.orderId)
        throw new BadRequestError('Order id required');
      const order = await orderRepository.findOne({
        where: {
          id: createReportRequest.orderId,
        },
      });
      if (!order) {
        throw new BadRequestError('Order not found');
      }
      const existedOrderReport = await repository.findOne({
        where: {
          order: { id: createReportRequest.orderId },
          reporter: { id: loginUser },
        },
      });
      if (existedOrderReport)
        throw new BadRequestError('Only report once for this order');
      report.order = order;
    }
    return await report.save();
  }

  async filterReports(
    filterReportsRequest: FilterReportsRequest,
    paging: Paging,
    loginUser: string
  ) {
    const account = await accountRepository.findOne({
      where: {
        id: loginUser,
      },
      relations: {
        role: true,
      },
    });
    const { types, statuses, assigneeId } = filterReportsRequest;

    const queryBuilder = repository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.assignee', 'assignee')
      .leftJoinAndSelect('report.files', 'files')
      .leftJoinAndSelect('report.order', 'order')
      .leftJoinAndSelect('report.booking', 'booking');
    bookingService.queryBuilderForBooking(queryBuilder);
    orderService.queryBuilderForOrder(queryBuilder);

    if (account.role.role == RoleEnum.CUSTOMER) {
      queryBuilder.andWhere('report.reporter.id = :reporterId', {
        reporterId: loginUser,
      });
    }

    if (types && types.length > 0) {
      queryBuilder.andWhere('report.type IN (:...types)', { types });
    }

    if (statuses && statuses.length > 0) {
      queryBuilder.andWhere('report.status IN (:...statuses)', { statuses });
    }

    if (assigneeId) {
      queryBuilder.andWhere('report.assignee.id = :assigneeId', { assigneeId });
    }

    queryBuilder.orderBy('report.createdAt', 'DESC');

    const [items, total] = await queryBuilder
      .skip((paging.page - 1) * paging.limit)
      .take(paging.limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / paging.limit);

    return {
      total,
      totalPages,
      items,
    };
  }

  constructor() {
    super(repository);
  }
}
export const reportService = new ReportService();
