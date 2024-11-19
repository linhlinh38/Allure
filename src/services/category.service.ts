import { AppDataSource } from "../dataSource";
import { Category } from "../entities/category.entity";
import { BadRequestError } from "../errors/error";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(Category);
class CategoryService extends BaseService<Category> {
  constructor() {
    super(repository);
  }

  async getAll() {
    const category = await repository.find({
      relations: ["parentCategory", "subCategories"],
    });

    return category;
  }
  async getById(id: string) {
    const category = await repository.find({
      where: { id },
      relations: ["parentCategory", "subCategories"],
    });

    return category;
  }
  async beforeCreate(body: Category) {
    const checkCate = await this.findBy(body.name, "name");
    if (checkCate.length > 0) {
      throw new BadRequestError("Category already Existed");
    }
  }
}
export const categoryService = new CategoryService();
