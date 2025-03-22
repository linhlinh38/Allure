import { AppDataSource } from "../dataSource";
import { Category } from "../entities/category.entity";
import { BadRequestError } from "../errors/error";
import { StatusEnum } from "../utils/enum";
import { BaseService } from "./base.service";
import { masterConfigService } from "./masterConfig.service";

const repository = AppDataSource.getRepository(Category);
class CategoryService extends BaseService<Category> {
  constructor() {
    super(repository);
  }

  async getAll() {
    const categoryRepository = AppDataSource.getRepository(Category);

    const categories = await categoryRepository.find({
      relations: ["parentCategory", "subCategories"],
    });

    const categoryMap = new Map<string, Category>();

    const rootCategories: Category[] = [];

    categories.forEach((category) => {
      category.subCategories = [];
      categoryMap.set(category.id, category);

      if (category.parentCategory) {
        const parent = categoryMap.get(category.parentCategory.id);
        if (parent) {
          parent.subCategories.push(category);
        }
      } else {
        rootCategories.push(category);
      }
    });

    return rootCategories;
  }
  async getById(id: string) {
    const category = await repository.find({
      where: { id },
      relations: [
        "parentCategory",
        "subCategories",
        "subCategories.subCategories",
      ],
    });

    return category;
  }

  async filterCategories(filter: {
    name?: string;
    level?: number;
    parentCategoryId?: string;
    statuses?: StatusEnum[];
    sortBy?: keyof Category;
    order?: "ASC" | "DESC";
    page?: number;
    limit?: number;
  }): Promise<{
    items: Category[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.repository.createQueryBuilder("category");

    // Filter by name
    if (filter.name) {
      queryBuilder.andWhere("category.name ILIKE :name", {
        name: `%${filter.name}%`,
      });
    }

    // Filter by level
    if (filter.level !== undefined) {
      queryBuilder.andWhere("category.level = :level", { level: filter.level });
    }

    // Filter by parent category
    if (filter.parentCategoryId) {
      queryBuilder.andWhere("category.parentCategory.id = :parentCategoryId", {
        parentCategoryId: filter.parentCategoryId,
      });
    }

    // Filter by statuses
    if (filter.statuses && filter.statuses.length > 0) {
      queryBuilder.andWhere("category.status IN (:...statuses)", {
        statuses: filter.statuses,
      });
    }

    // Sorting
    const sortBy = filter.sortBy || "id"; // Default to sorting by "id"
    const order = filter.order || "ASC"; // Default to ascending order
    queryBuilder.orderBy(`category.${sortBy}`, order);

    // Pagination
    const page = filter.page || 1; // Default to page 1
    const limit = filter.limit || 10; // Default to 10 items per page
    queryBuilder.skip((page - 1) * limit).take(limit);

    // Execute the query
    const [items, total] = await queryBuilder.getManyAndCount();

    return { items, total, page, limit };
  }

  async beforeCreate(body: Category) {
    const checkCateName = await this.findBy(body.name, "name");
    const [masterConfig] = await masterConfigService.findAll();
    console.log(masterConfig);

    if (checkCateName.length > 0) {
      throw new BadRequestError("Category already Existed");
    }

    if (body.parentCategory) {
      const parentCategory = await this.repository.findOne({
        where: { id: body.parentCategory as any },
        relations: ["parentCategory"],
      });

      if (!parentCategory) {
        throw new BadRequestError("Parent category not found");
      }

      const depth = await this.calculateCategoryDepth(parentCategory);

      if (depth + 1 > masterConfig.maxLevelCategory) {
        throw new BadRequestError(
          "A category cannot have more than 4 levels of subcategories"
        );
      }

      body.level = depth + 1;
    } else {
      body.level = 1;
    }
  }

  private async calculateCategoryDepth(category: Category): Promise<number> {
    let depth = 1;

    while (category.parentCategory) {
      const parentCategory = await this.repository.findOne({
        where: { id: category.parentCategory.id },
        relations: ["parentCategory"],
      });

      if (!parentCategory) break;

      category = parentCategory;
      depth++;
    }

    return depth;
  }
  async update(id: string, updatedData: Partial<Category>): Promise<Category> {
    const [masterConfig] = await masterConfigService.findAll();
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const categoryRepository = queryRunner.manager.getRepository(Category);

      // Fetch the category to be updated
      const category = await categoryRepository.findOne({
        where: { id },
        relations: ["parentCategory"],
      });

      if (!category) {
        throw new Error("Category not found.");
      }

      // Update the category fields
      if (updatedData.name) {
        category.name = updatedData.name;
      }
      if (updatedData.detail) {
        category.detail = updatedData.detail;
      }
      if (updatedData.status) {
        category.status = updatedData.status;
      }

      // Handle parentCategory update
      if (updatedData.parentCategory) {
        const newParentCategory = await categoryRepository.findOne({
          where: { id: updatedData.parentCategory as any },
        });

        if (!newParentCategory) {
          throw new Error("New parent category not found.");
        }

        category.parentCategory = newParentCategory;
        category.level = newParentCategory.level + 1;

        // Enforce maximum level restriction
        if (category.level > masterConfig.maxLevelCategory) {
          throw new Error(
            "A category cannot have more than 4 levels of subcategories."
          );
        }
      }

      // Save the updated category
      await categoryRepository.save(category);

      // Update child levels if the category's level changed
      const categoriesToUpdate: Category[] = [];
      const queue: Category[] = [category]; // Start with the current category

      while (queue.length > 0) {
        const currentParent = queue.shift(); // Get the next parent in the queue

        // Fetch all direct children of the current parent
        const children = await categoryRepository.find({
          where: { parentCategory: { id: currentParent.id } },
        });

        for (const child of children) {
          // Update the child's level based on the current parent's level
          child.level = currentParent.level + 1;

          // Enforce maximum level restriction
          if (child.level > masterConfig.maxLevelCategory) {
            throw new Error(
              "A category cannot have more than 4 levels of subcategories."
            );
          }

          categoriesToUpdate.push(child); // Add the child to the list of categories to update
          queue.push(child); // Add the child to the queue for further processing
        }
      }

      await categoryRepository.save(categoriesToUpdate);

      await queryRunner.commitTransaction();
      return category;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const categoryService = new CategoryService();
