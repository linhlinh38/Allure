import { Report } from './../entities/report.entity';
import { AppDataSource } from '../dataSource';
import {
  CreateReportRequest,
  FilterReportsRequest,
} from '../dtos/request/report.request';
import { BaseService } from './base.service';
import { File } from '../entities/file.entity';
import { Account } from '../entities/account.entity';
import { ReportStatusEnum, ReportTypeEnum } from '../utils/enum';
import { bookingRepository } from '../repositories/booking.repository';
import { BadRequestError } from '../errors/error';
import { orderRepository } from '../repositories/order.repository';
import { accountRepository } from '../repositories/account.repository';
import { SelectQueryBuilder } from 'typeorm';

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
    if (report.assignee.id != loginUser)
      throw new BadRequestError('Only assignee can note result');
    report.resultNote = resultNote;
    await repository.save(report);
  }

  async updateStatus(id: string, status: ReportStatusEnum) {
    const report = await repository.findOneBy({ id: id });
    if (!report) throw new BadRequestError(`Report not found`);
    report.status = status;
    await repository.save(report);
  }

  async assign(reportId: string, assigneeId: string) {
    const report = await repository.findOneBy({ id: reportId });
    if (!report) throw new BadRequestError(`Report not found`);
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
      const existedBookingReport = await repository.findOne({
        where: {
          booking: { id: createReportRequest.bookingId },
          reporter: { id: loginUser },
        },
      });
      if (existedBookingReport)
        throw new BadRequestError('You only report once for this booking');
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
        throw new BadRequestError('You only report once for this order');
      report.order = order;
    }
    return await report.save();
  }

  async queryBuilderForBooking(queryBuilder: SelectQueryBuilder<Report>) {
    queryBuilder
      .leftJoinAndSelect('booking.consultantService', 'consultantService')
      .leftJoinAndSelect('consultantService.account', 'consultant')
      .leftJoinAndSelect('consultantService.images', 'consultantServiceImages');
  }

  async queryBuilderForOrder(queryBuilder: SelectQueryBuilder<Report>) {
    queryBuilder
      .leftJoinAndSelect('order.orderDetails', 'orderDetail')
      .leftJoinAndSelect(
        'orderDetail.productClassification',
        'productClassification'
      )
      .leftJoinAndSelect(
        'productClassification.images',
        'productClassificationImages'
      )
      .leftJoinAndSelect('productClassification.product', 'product')
      .leftJoinAndSelect('product.brand', 'productBrand')
      .leftJoinAndSelect('product.images', 'productImages')
      .leftJoinAndSelect(
        'productClassification.productDiscount',
        'productDiscount'
      )
      .leftJoinAndSelect('productDiscount.product', 'discountProduct')
      .leftJoinAndSelect('discountProduct.brand', 'discountProductBrand')
      .leftJoinAndSelect('discountProduct.images', 'discountProductImages')
      .leftJoinAndSelect(
        'productClassification.preOrderProduct',
        'preOrderProduct'
      )
      .leftJoinAndSelect('preOrderProduct.product', 'preOrderProductItem')
      .leftJoinAndSelect('preOrderProductItem.brand', 'preOrderProductBrand')
      .leftJoinAndSelect('preOrderProductItem.images', 'preOrderProductImages');
  }

  async filterReports(filterReportsRequest: FilterReportsRequest) {
    const { type, status, assigneeId } = filterReportsRequest;

    const queryBuilder = repository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.reporter', 'reporter')
      .leftJoinAndSelect('report.assignee', 'assignee')
      .leftJoinAndSelect('report.files', 'files')
      .leftJoinAndSelect('report.order', 'order')
      .leftJoinAndSelect('report.booking', 'booking');
    this.queryBuilderForBooking(queryBuilder);
    this.queryBuilderForOrder(queryBuilder);

    if (type) {
      queryBuilder.andWhere('report.type = :type', { type });
    }

    if (status) {
      queryBuilder.andWhere('report.status = :status', { status });
    }

    if (assigneeId) {
      queryBuilder.andWhere('report.assignee.id = :assigneeId', { assigneeId });
    }

    queryBuilder.orderBy('report.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  constructor() {
    super(repository);
  }
}
export const reportService = new ReportService();
