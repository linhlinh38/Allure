import { AppDataSource } from "../dataSource";
import { MasterConfig } from "../entities/masterConfig.entity";
import { BadRequestError } from "../errors/error";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(MasterConfig);
class MasterConfigService extends BaseService<MasterConfig> {
  constructor() {
    super(repository);
  }
}
export const masterConfigService = new MasterConfigService();
