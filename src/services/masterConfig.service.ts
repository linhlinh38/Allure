import { AppDataSource } from "../dataSource";
import { BannerConfig } from "../entities/bannerConfig.entity";
import { MasterConfig } from "../entities/masterConfig.entity";
import { BadRequestError } from "../errors/error";
import { masterConfigRepository } from "../repositories/masterConfig.repository";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(MasterConfig);
class MasterConfigService extends BaseService<MasterConfig> {
  constructor() {
    super(repository);
  }
  async findAll() {
    const config = await repository.find({
      relations: ['banners'],
    });

    return config;
  }

  async updateMasterConfig(id: string, data: any) {
    const masterConfig = await masterConfigRepository.findOne({
      where: {
        id
      }
    })
    if(!masterConfig) throw new BadRequestError('Master config not found');
    Object.assign(masterConfig, data);
    masterConfig.save();
  }
}
export const masterConfigService = new MasterConfigService();
