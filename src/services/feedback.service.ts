import { Brackets } from 'typeorm';
import { AppDataSource } from '../dataSource';
import {
  FeedbackCreateForBookingRequest,
  FeedbackCreateRequest,
  FeedbackFilterRequest,
  FilterConsultantFeedbackRequest,
} from '../dtos/request/feedback.request';
import { Feedback } from '../entities/feedback.entity';
import { BadRequestError } from '../errors/error';
import { feedbackRepository } from '../repositories/feedback.repository';
import { masterConfigRepository } from '../repositories/masterConfig.repository';
import { orderDetailRepository } from '../repositories/orderDetail.repository';
import { productRepository } from '../repositories/product.repository';
import { statusTrackingRepository } from '../repositories/statusTracking.repository';
import {
  BookingStatusEnum,
  FeedbackFilterEnum,
  ShippingStatusEnum,
} from '../utils/enum';
import { BaseService } from './base.service';
import { Reply } from '../entities/reply.entity';
import { Account } from '../entities/account.entity';
import { replyRepository } from '../repositories/reply.repository';
import { MediaFile } from '../entities/mediaFile.entity';
import { Paging } from '../dtos/other/paging.dto';
import { bookingRepository } from '../repositories/booking.repository';
import { accountRepository } from '../repositories/account.repository';

const repository = AppDataSource.getRepository(Feedback);
class FeedbackService extends BaseService<Feedback> {
  async getById(id: string) {
    const feedback = await feedbackRepository.findOne({
      where: {
        id,
      },
      relations: {
        replies: { account: true },
        mediaFiles: true,
        orderDetail: {
          order: { account: true },
          productClassification: {
            product: true,
            preOrderProduct: { product: true },
            productDiscount: { product: true },
          },
        },
      },
    });
    if (!feedback) throw new BadRequestError('Feedback not found');
    return feedback;
  }
  async reply(content: string, feedbackId: string, loginUser: string) {
    const feedback = await feedbackRepository.findOne({
      where: {
        id: feedbackId,
      },
    });
    if (!feedback) throw new BadRequestError('Feedback not found');
    const reply = new Reply();
    reply.content = content;
    reply.feedback = feedback;
    reply.account = new Account();
    reply.account.id = loginUser;
    return await replyRepository.save(reply);
  }

  async filter(
    feedbackFilterRequest: FeedbackFilterRequest,
    productId: string,
    paging: Paging
  ) {
    const limit = paging.limit;
    const offset = (paging.page - 1) * paging.limit;
    const product = await productRepository.findOne({
      where: { id: productId },
    });
    if (!product) throw new BadRequestError('Product not found');
    const numberTotalFeedbacks = await this.countAllFeedbacksOfProduct(
      productId,
      feedbackFilterRequest
    );
    const totalPages = Math.ceil(numberTotalFeedbacks / paging.limit);
    const query = this.retrieveQueryGetAllFeedbacksOfProduct(productId)
      .orderBy('feedback.createdAt', 'DESC')
      .take(limit)
      .skip(offset);
    switch (feedbackFilterRequest.type) {
      case FeedbackFilterEnum.ALL:
        break;
      case FeedbackFilterEnum.IMAGE_VIDEO:
        query.andWhere('mediaFiles.id IS NOT NULL');
        break;
      case FeedbackFilterEnum.RATING:
        if (!feedbackFilterRequest.value)
          throw new BadRequestError('Rating must be provided');
        const rating = parseInt(feedbackFilterRequest.value);
        if (rating < 0 || rating > 5)
          throw new BadRequestError('Rating must be between 0 and 5');
        query.andWhere('feedback.rating = :rating', { rating });
        break;
      case FeedbackFilterEnum.CLASSIFICATION:
        if (!feedbackFilterRequest.value)
          throw new BadRequestError('Classification must be provided');
        query.andWhere('productClassification.id = :classificationId', {
          classificationId: feedbackFilterRequest.value,
        });
        break;
      default:
        throw new BadRequestError('Invalid filter type');
    }
    return {
      total: numberTotalFeedbacks,
      totalPages,
      items: await query.getMany(),
    };
  }

  retrieveQueryGetAllFeedbacksWithoutReplyOfProduct(productId: string) {
    return feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.mediaFiles', 'mediaFiles')
      .leftJoinAndSelect('feedback.orderDetail', 'orderDetail')
      .leftJoinAndSelect('orderDetail.order', 'order')
      .leftJoinAndSelect('order.account', 'account')
      .leftJoinAndSelect(
        'orderDetail.productClassification',
        'productClassification'
      )
      .leftJoinAndSelect('productClassification.product', 'product')
      .leftJoinAndSelect(
        'productClassification.productDiscount',
        'productDiscount'
      )
      .leftJoinAndSelect(
        'productClassification.preOrderProduct',
        'preOrderProduct'
      )
      .where(
        new Brackets((qb) => {
          qb.where('product.id = :productId', { productId })
            .orWhere('productDiscount.product.id = :productId', { productId })
            .orWhere('preOrderProduct.product.id = :productId', { productId });
        })
      );
  }

  retrieveQueryGetAllFeedbacksOfProduct(productId: string) {
    return feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.mediaFiles', 'mediaFiles')
      .leftJoinAndSelect('feedback.replies', 'replies')
      .leftJoinAndSelect('replies.account', 'replier')
      .leftJoinAndSelect('replier.role', 'replierRole')
      .leftJoinAndSelect('feedback.orderDetail', 'orderDetail')
      .leftJoinAndSelect('orderDetail.order', 'order')
      .leftJoinAndSelect('order.account', 'account')
      .leftJoinAndSelect(
        'orderDetail.productClassification',
        'productClassification'
      )
      .leftJoinAndSelect('productClassification.product', 'product')
      .leftJoinAndSelect(
        'productClassification.productDiscount',
        'productDiscount'
      )
      .leftJoinAndSelect(
        'productClassification.preOrderProduct',
        'preOrderProduct'
      )
      .where(
        new Brackets((qb) => {
          qb.where('product.id = :productId', { productId })
            .orWhere('productDiscount.product.id = :productId', { productId })
            .orWhere('preOrderProduct.product.id = :productId', { productId });
        })
      );
  }

  async countAllFeedbacksOfProduct(
    productId: string,
    feedbackFilterRequest: FeedbackFilterRequest
  ) {
    const query = feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoin('feedback.orderDetail', 'orderDetail')
      .leftJoin('orderDetail.productClassification', 'productClassification')
      .leftJoin('productClassification.product', 'product')
      .leftJoin('productClassification.productDiscount', 'productDiscount')
      .leftJoin('productClassification.preOrderProduct', 'preOrderProduct')
      .where(
        new Brackets((qb) => {
          qb.where('product.id = :productId', { productId })
            .orWhere('productDiscount.product.id = :productId', { productId })
            .orWhere('preOrderProduct.product.id = :productId', { productId });
        })
      );
    switch (feedbackFilterRequest.type) {
      case FeedbackFilterEnum.ALL:
        break;
      case FeedbackFilterEnum.IMAGE_VIDEO:
        query.andWhere(
          (qb) =>
            `EXISTS (${qb
              .subQuery()
              .select('1')
              .from('media_files', 'fm')
              .where('fm.feedback_id = feedback.id')
              .getQuery()})`
        );
        break;
      case FeedbackFilterEnum.RATING:
        if (!feedbackFilterRequest.value)
          throw new BadRequestError('Rating must be provided');
        const rating = parseInt(feedbackFilterRequest.value);
        if (rating < 0 || rating > 5)
          throw new BadRequestError('Rating must be between 0 and 5');
        query.andWhere('feedback.rating = :rating', { rating });
        break;
      case FeedbackFilterEnum.CLASSIFICATION:
        if (!feedbackFilterRequest.value)
          throw new BadRequestError('Classification must be provided');
        query.andWhere('productClassification.id = :classificationId', {
          classificationId: feedbackFilterRequest.value,
        });
        break;
      default:
        throw new BadRequestError('Invalid filter type');
    }
    return await query.getCount();
  }

  async reviewGeneralOfProduct(productId: string) {
    const product = await productRepository.findOne({
      where: { id: productId },
    });
    if (!product) throw new BadRequestError('Product not found');
    const result = await this.retrieveQueryGetAllFeedbacksWithoutReplyOfProduct(
      productId
    )
      .select([
        'AVG(DISTINCT feedback.rating) AS average_rating',
        'COUNT(DISTINCT feedback.id) AS total_count',
        'COUNT(DISTINCT CASE WHEN feedback.rating = 1 THEN feedback.id END) AS rating1',
        'COUNT(DISTINCT CASE WHEN feedback.rating = 2 THEN feedback.id END) AS rating2',
        'COUNT(DISTINCT CASE WHEN feedback.rating = 3 THEN feedback.id END) AS rating3',
        'COUNT(DISTINCT CASE WHEN feedback.rating = 4 THEN feedback.id END) AS rating4',
        'COUNT(DISTINCT CASE WHEN feedback.rating = 5 THEN feedback.id END) AS rating5',
      ])
      .getRawOne();

    const averageRating = parseFloat(result?.average_rating || 0).toFixed(1);
    const totalCount = result?.total_count || 0;
    const rating1Count = result?.rating1 || 0;
    const rating2Count = result?.rating2 || 0;
    const rating3Count = result?.rating3 || 0;
    const rating4Count = result?.rating4 || 0;
    const rating5Count = result?.rating5 || 0;

    return {
      averageRating,
      totalCount,
      rating1Count,
      rating2Count,
      rating3Count,
      rating4Count,
      rating5Count,
    };
  }
  async getMyFeedbacks(loginUser: string) {
    return await feedbackRepository.find({
      where: { orderDetail: { order: { account: { id: loginUser } } } },
      relations: {
        mediaFiles: true,
        replies: { account: true },
        orderDetail: {
          order: { account: true },
          productClassification: {
            product: true,
            preOrderProduct: { product: true },
            productDiscount: { product: true },
          },
        },
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  async getConsultantFeedbacks(consultantId: string) {
    const consultant = await accountRepository.findOne({
      where: {
        id: consultantId,
      },
    });
    if (!consultant) throw new BadRequestError('Consultant not found');
    return await feedbackRepository.find({
      where: {
        booking: {
          consultantService: {
            account: {
              id: consultantId,
            },
          },
        },
      },
      relations: {
        mediaFiles: true,
        replies: { account: true },
        booking: {
          account: true,
          consultantService: {
            account: true,
          },
        },
      },
    });
  }

  async createFeedbackForBooking(
    feedbackCreateForBookingRequest: FeedbackCreateForBookingRequest,
    loginUser: string
  ) {
    const booking = await bookingRepository.findOne({
      where: {
        id: feedbackCreateForBookingRequest.bookingId,
      },
      relations: {
        account: true,
        feedback: true,
      },
    });
    if (!booking) throw new BadRequestError('Booking not found');
    if (booking.account.id !== loginUser)
      throw new BadRequestError(
        'You are not allowed to create feedback for this booking'
      );
    if (booking.status != BookingStatusEnum.COMPLETED)
      throw new BadRequestError('This booking is not completed yet');
    if (booking.feedback)
      throw new BadRequestError(
        'You already created a feedback for this booking'
      );
    const feedback = new Feedback();
    feedback.rating = feedbackCreateForBookingRequest.rating;
    feedback.content = feedbackCreateForBookingRequest.content;
    feedback.booking = booking;
    feedback.mediaFiles = feedbackCreateForBookingRequest.mediaFiles.map(
      (mediaFile) => {
        const mediaFileEntity = new MediaFile();
        mediaFileEntity.fileUrl = mediaFile;
        return mediaFileEntity;
      }
    );
    return await feedbackRepository.save(feedback);
  }

  async createFeedback(
    feedbackCreateRequest: FeedbackCreateRequest,
    loginUser: string
  ) {
    const orderDetail = await orderDetailRepository.findOne({
      where: {
        id: feedbackCreateRequest.orderDetailId,
      },
      relations: {
        order: {
          account: true,
        },
        feedback: true,
      },
    });
    if (!orderDetail) throw new BadRequestError('Order detail not found');
    console.log(orderDetail.order);

    if (orderDetail.order.account.id !== loginUser)
      throw new BadRequestError(
        'You are not allowed to create feedback for this order'
      );
    if (orderDetail.order.status != ShippingStatusEnum.COMPLETED)
      throw new BadRequestError('This order is not completed yet');
    if (orderDetail.feedback)
      throw new BadRequestError(
        'You already created a feedback for this order detail'
      );
    const completedStatusTracking = await statusTrackingRepository.findOne({
      where: {
        order: { id: orderDetail.order.id },
        status: ShippingStatusEnum.COMPLETED,
      },
    });
    if (!completedStatusTracking)
      throw new BadRequestError('Completed status tracking not found');
    const masterConfig = (await masterConfigRepository.find({ take: 1 }))[0];
    if (
      completedStatusTracking.updatedAt.getTime() +
        masterConfig.feedbackTimeExpired <
      Date.now()
    ) {
      throw new BadRequestError('Time to feedback is expired');
    }
    const feedback = new Feedback();
    feedback.rating = feedbackCreateRequest.rating;
    feedback.content = feedbackCreateRequest.content;
    feedback.orderDetail = orderDetail;
    feedback.mediaFiles = feedbackCreateRequest.mediaFiles.map((mediaFile) => {
      const mediaFileEntity = new MediaFile();
      mediaFileEntity.fileUrl = mediaFile;
      return mediaFileEntity;
    });
    return await feedbackRepository.save(feedback);
  }

  async filterConsultantFeedbacks(
    consultantId: string,
    filterRequest: FilterConsultantFeedbackRequest,
    paging: Paging
  ) {
    const limit = paging.limit;
    const offset = (paging.page - 1) * paging.limit;

    // Get total count of feedbacks
    const queryBuilder = feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.booking', 'booking')
      .leftJoinAndSelect('booking.consultantService', 'consultantService')
      .leftJoinAndSelect('consultantService.account', 'consultant')
      .leftJoinAndSelect('feedback.mediaFiles', 'mediaFiles')
      .where('consultant.id = :consultantId', { consultantId });

    // Apply filters
    switch (filterRequest.type) {
      case FeedbackFilterEnum.ALL:
        break;
      case FeedbackFilterEnum.IMAGE_VIDEO:
        queryBuilder.andWhere('mediaFiles.id IS NOT NULL');
        break;
      case FeedbackFilterEnum.RATING:
        const rating = filterRequest.value ? parseInt(filterRequest.value) : 5; // Default to 5 stars if not specified
        if (isNaN(rating) || rating < 0 || rating > 5) {
          throw new BadRequestError('Rating must be a number between 0 and 5');
        }
        queryBuilder.andWhere('feedback.rating = :rating', { rating });
        break;
      default:
        throw new BadRequestError('Invalid filter type');
    }

    // Get total count
    const totalFeedbacks = await queryBuilder.getCount();

    // Get paginated results
    const feedbacks = await queryBuilder
      .orderBy('feedback.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return {
      total: totalFeedbacks,
      totalPages: Math.ceil(totalFeedbacks / limit),
      items: feedbacks,
    };
  }

  constructor() {
    super(repository);
  }
}

export const feedbackService = new FeedbackService();
