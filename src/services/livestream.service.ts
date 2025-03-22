import { In } from "typeorm";
import { AppDataSource } from "../dataSource";
import { LiveStream } from "../entities/livestream.entity";
import { BadRequestError } from "../errors/error";
import { productRepository } from "../repositories/product.repository";
import { BaseService } from "./base.service";
import { LiveStreamEnum } from "../utils/enum";
import { RtcTokenBuilder } from "agora-access-token";
import { config } from "../configs/envConfig";
import { LivestreamTokenData } from "../dtos/request/livestreamToken.request";

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
      relations: ["account", "products"],
    });
  }

  async findById(id: string): Promise<LiveStream> {
    return await this.repository.findOne({
      where: [{ id }],
      relations: ["account", "products"],
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
        const productEntities = await productRepository.find({
          where: { id: In(products) },
        });

        if (productEntities.length !== products.length) {
          throw new BadRequestError("Some products not found");
        }
        livestream.products = productEntities;
        await queryRunner.manager.save(livestream);
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
        relations: ["products"],
      });
      if (!livestream) {
        throw new BadRequestError("Livestream not found");
      }

      livestream.products = [];

      if (products && products.length > 0) {
        const productEntities = await productRepository.find({
          where: { id: In(products) },
        });

        if (productEntities.length !== products.length) {
          throw new BadRequestError("Some products not found");
        }
        livestreamInfo.products = productEntities;
      }
      queryRunner.manager.merge(LiveStream, livestream, livestreamInfo);
      await queryRunner.manager.save(livestream);

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
      appId == "" ||
      appCertificate == undefined ||
      appCertificate == ""
    ) {
      console.log(
        "Need to set environment variable AGORA_APP_ID and AGORA_APP_CERTIFICATE"
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
}
export const livestreamService = new LiveStreamService();
