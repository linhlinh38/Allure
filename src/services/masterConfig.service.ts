import { AppDataSource } from "../dataSource";
import { MasterConfig } from "../entities/masterConfig.entity";
import { BadRequestError } from "../errors/error";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(MasterConfig);
class MasterConfigService extends BaseService<MasterConfig> {
  constructor() {
    super(repository);
  }
  async findAll() {
    const config = await repository.find({
      relations: ["banners"],
    });

    return config;
  }
}
export const masterConfigService = new MasterConfigService();
