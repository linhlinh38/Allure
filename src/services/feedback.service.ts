import { Brackets } from 'typeorm';
import { AppDataSource } from '../dataSource';
import {
  FeedbackCreateRequest,
  FeedbackFilterRequest,
} from '../dtos/request/feedback.request';
import { Feedback } from '../entities/feedback.entity';
import { FeedbackMediaFile } from '../entities/feedbackMediafile.entity';
import { BadRequestError } from '../errors/error';
import { feedbackRepository } from '../repositories/feedback.repository';
import { masterConfigRepository } from '../repositories/masterConfig.repository';
import { orderDetailRepository } from '../repositories/orderDetail.repository';
import { productRepository } from '../repositories/product.repository';
import { statusTrackingRepository } from '../repositories/statusTracking.repository';
import { FeedbackFilterEnum, ShippingStatusEnum } from '../utils/enum';
import { BaseService } from './base.service';
import { Reply } from '../entities/reply.entity';
import { Account } from '../entities/account.entity';
import { replyRepository } from '../repositories/reply.repository';

const repository = AppDataSource.getRepository(Feedback);
class FeedbackService extends BaseService<Feedback> {
  async getById(id: string)
  {
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
  async reply(content: string, feedbackId: string, loginUser: string)
  {
    const feedback = await feedbackRepository.findOne({
      where: {
        id: feedbackId,
      }
    })
    if(!feedback) throw new BadRequestError('Feedback not found');
    const reply = new Reply();
    reply.content = content;
    reply.feedback = feedback;
    reply.account = new Account();
    reply.account.id = loginUser;
    return await replyRepository.save(reply);
  }
  async filter(
    feedbackFilterRequest: FeedbackFilterRequest,
    productId: string
  ) {
    const product = await productRepository.findOne({
      where: { id: productId },
    });
    if (!product) throw new BadRequestError('Product not found');
    const query = this.retrieveQueryGetAllFeedbacksOfProduct(productId).orderBy(
      'feedback.createdAt',
      'DESC'
    );
    switch (feedbackFilterRequest.type) {
      case FeedbackFilterEnum.ALL:
        break;
      case FeedbackFilterEnum.IMAGE_VIDEO:
        query.andWhere('mediaFiles.id IS NOT NULL');
        break;
      case FeedbackFilterEnum.RATING:
        if(!feedbackFilterRequest.value) throw new BadRequestError('Rating must be provided');
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
    return query.getMany();
  }

  retrieveQueryGetAllFeedbacksOfProduct(productId: string) {
    return feedbackRepository
      .createQueryBuilder('feedback')
      .leftJoinAndSelect('feedback.mediaFiles', 'mediaFiles')
      .leftJoinAndSelect('feedback.replies', 'replies')
      .leftJoinAndSelect('replies.account', 'replyAccount')
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
  async reviewGeneralOfProduct(productId: string) {
    const product = await productRepository.findOne({
      where: { id: productId },
    });
    if (!product) throw new BadRequestError('Product not found');
    const result = await this.retrieveQueryGetAllFeedbacksOfProduct(productId)
      .select([
        'AVG(feedback.rating) AS average_rating',
        'COUNT(feedback.rating) AS total_count',
        'SUM(CASE WHEN feedback.rating = 1 THEN 1 ELSE 0 END) AS rating1',
        'SUM(CASE WHEN feedback.rating = 2 THEN 1 ELSE 0 END) AS rating2',
        'SUM(CASE WHEN feedback.rating = 3 THEN 1 ELSE 0 END) AS rating3',
        'SUM(CASE WHEN feedback.rating = 4 THEN 1 ELSE 0 END) AS rating4',
        'SUM(CASE WHEN feedback.rating = 5 THEN 1 ELSE 0 END) AS rating5',
      ])
      .getRawOne();

    const averageRating = parseFloat(result.average_rating).toFixed(1);
    const totalCount = result.total_count;
    const rating1Count = result.rating1;
    const rating2Count = result.rating2;
    const rating3Count = result.rating3;
    const rating4Count = result.rating4;
    const rating5Count = result.rating5;

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
        replies: {account: true},
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
        masterConfig.timeToFeedback <
      Date.now()
    ) {
      throw new BadRequestError('Time to feedback is expired');
    }
    const feedback = new Feedback();
    feedback.rating = feedbackCreateRequest.rating;
    feedback.content = feedbackCreateRequest.content;
    feedback.orderDetail = orderDetail;
    feedback.mediaFiles = feedbackCreateRequest.mediaFiles.map((mediaFile) => {
      const mediaFileEntity = new FeedbackMediaFile();
      mediaFileEntity.fileUrl = mediaFile;
      return mediaFileEntity;
    });
    return await feedbackRepository.save(feedback);
  }
  constructor() {
    super(repository);
  }
}

export const feedbackService = new FeedbackService();
