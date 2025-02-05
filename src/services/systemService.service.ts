import { AppDataSource } from "../dataSource";
import { SystemService } from "../entities/systemService.entity";
import { BadRequestError } from "../errors/error";
import { BaseService } from "./base.service";
import { categoryService } from "./category.service";

const repository = AppDataSource.getRepository(SystemService);
class SystemServiceService extends BaseService<SystemService> {
  constructor() {
    super(repository);
  }

  async beforeCreate(body: SystemService) {
    const checkService = await this.findBy(body.name, "name");
    if (checkService.length > 0) {
      throw new BadRequestError("Service already Existed");
    }

    if (body.category) {
      const checkCategory = await categoryService.findById(body.category);
      if (!checkCategory) throw new BadRequestError("Category not found");
    }
  }
}
export const systemServiceService = new SystemServiceService();
