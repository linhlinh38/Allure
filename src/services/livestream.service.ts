import { In } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { LiveStream } from '../entities/livestream.entity';
import { BadRequestError } from '../errors/error';
import { productRepository } from '../repositories/product.repository';
import { BaseService } from './base.service';
import {
  AccountStatusEnum,
  LiveStreamEnum,
  NotificationTypeEnum,
  RoleEnum,
} from '../utils/enum';
import { RtcTokenBuilder } from 'agora-access-token';
import { config } from '../configs/envConfig';
import { LivestreamTokenData } from '../dtos/request/livestreamToken.request';
import { LivestreamProduct } from '../entities/livestreamProduct.entity';
import { fcmTokenRepository } from '../repositories/fcmToken.repository';
import { FCMService } from './FCM.service';
import { Account } from '../entities/account.entity';
import {
  LivestreamFilterRequest,
} from '../dtos/request/livestreamFilter.request';
import { Paging } from '../dtos/other/paging.dto';

const repository = AppDataSource.getRepository(LiveStream);
class LiveStreamService extends BaseService<LiveStream> {
  constructor() {
    super(repository);
  }

  async getActiveLiveStreams(): Promise<LiveStream[]> {
    return await this.repository.find({
      where: [
        { status: LiveStreamEnum.SCHEDULED },
        { status: LiveStreamEnum.LIVE },
      ],
      relations: [
        'account',
        'livestreamProducts',
        'livestreamProducts.product',
        'livestreamProducts.product.productClassifications',
        'livestreamProducts.product.productClassifications.images',
      ],
    });
  }

  async findById(id: string): Promise<LiveStream> {
    return await this.repository.findOne({
      where: [{ id }],
      relations: [
        'account',
        'livestreamProducts',
        'livestreamProducts.product',
        'livestreamProducts.product.images',
        'livestreamProducts.product.productClassifications',
        'livestreamProducts.product.productClassifications.images',
      ],
    });
  }

  async create(livestreamData: any): Promise<LiveStream> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { products, ...livestreamInfo } = livestreamData;

      const livestream = queryRunner.manager.create(LiveStream, livestreamInfo);
      await queryRunner.manager.save(livestream);

      if (products && products.length > 0) {
        for (const product of products) {
          const productEntity = await productRepository.findOneBy({
            id: product.id,
          });
          if (!productEntity) {
            throw new BadRequestError('Product not found');
          }
          const livestreamProduct = new LivestreamProduct();
          livestreamProduct.livestream = livestream;
          livestreamProduct.product = productEntity;
          livestreamProduct.discount = product.discount; // Set the discount
          await queryRunner.manager.save(LivestreamProduct, livestreamProduct);
        }
      }

      await queryRunner.commitTransaction();
      return livestream;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: string, livestreamData: any): Promise<LiveStream> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const { products, ...livestreamInfo } = livestreamData;

      const livestream = await queryRunner.manager.findOne(LiveStream, {
        where: { id },
      });
      if (!livestream) {
        throw new BadRequestError('Livestream not found');
      }

      if (products && products.length > 0) {
        await queryRunner.manager.delete(LivestreamProduct, {
          livestream: { id },
        });

        for (const product of products) {
          const productEntity = await productRepository.findOneBy({
            id: product.id,
          });
          if (!productEntity) {
            throw new BadRequestError('Product not found');
          }
          const livestreamProduct = new LivestreamProduct();
          livestreamProduct.livestream = livestream;
          livestreamProduct.product = productEntity;
          livestreamProduct.discount = product.discount; // Set the discount
          const productAdd = await queryRunner.manager.save(
            LivestreamProduct,
            livestreamProduct
          );
        }
      }

      if (
        livestreamInfo.status &&
        livestreamInfo.status === LiveStreamEnum.LIVE
      ) {
        const customer = await queryRunner.manager.find(Account, {
          where: {
            status: AccountStatusEnum.ACTIVE,
            role: { role: RoleEnum.CUSTOMER },
          },
          relations: { role: true },
        });
        //send notification to account
        const tokens = (
          await fcmTokenRepository.find({
            where: {
              account: {
                id: In(customer.map((cus) => cus.id)),
              },
            },
          })
        ).map((token) => token.token);
        const notificationData = {
          title: 'Livestream start!',
          body: `Join Livestream ${livestream.title} now`,
          data: {
            type: NotificationTypeEnum.LIVESTREAM_START,
            liveId: livestream.id,
          },
          accountIds: tokens,
          createdAt: new Date(),
        };
        await FCMService.sendMulticastNotification(tokens, notificationData);
      }
      queryRunner.manager.merge(LiveStream, livestream, livestreamInfo);
      await queryRunner.manager.save(LiveStream, livestream);

      await queryRunner.commitTransaction();
      return livestream;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async livestreamToken(data: LivestreamTokenData, account: string) {
    const appId = config.APP_ID;
    const appCertificate = config.APP_CERTIFICATE;

    if (
      appId == undefined ||
      appId == '' ||
      appCertificate == undefined ||
      appCertificate == ''
    ) {
      console.log(
        'Need to set environment variable AGORA_APP_ID and AGORA_APP_CERTIFICATE'
      );
      process.exit(1);
    }

    // Build token with uid
    const token = RtcTokenBuilder.buildTokenWithAccount(
      appId,
      appCertificate,
      data.channelName,
      account,
      data.role,
      data.privilegeExpirationInSecond
    );
    return token;
  }

  async filter(filterRequest: LivestreamFilterRequest, paging: Paging) {
    const { title, statuses } = filterRequest;
    const { page, limit } = paging;
    const offset = (page - 1) * limit;

    const queryBuilder = repository
      .createQueryBuilder('livestream')
      .leftJoinAndSelect('livestream.account', 'account')

    // Apply filters
    if (title) {
      queryBuilder.andWhere('LOWER(livestream.title) LIKE :title', {
        title: `%${title.toLowerCase()}%`,
      });
    }

    if (statuses && statuses.length > 0) {
      queryBuilder.andWhere('livestream.status IN (:...statuses)', {
        statuses,
      });
    }
    // Get paginated results
    const [items, total] = await queryBuilder
      .orderBy('livestream.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
export const livestreamService = new LiveStreamService();
