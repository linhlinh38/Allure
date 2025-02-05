import { AppDataSource } from "../dataSource";
import { Category } from "../entities/category.entity";
import { BadRequestError } from "../errors/error";
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
  async beforeCreate(body: Category) {
    const checkCateName = await this.findBy(body.name, "name");
    const masterConfig = await masterConfigService.findById(
      "054dbb3b-9c39-47c2-bbc7-04839cacb7f2"
    );
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
    const masterConfig = await masterConfigService.findById(
      "054dbb3b-9c39-47c2-bbc7-04839cacb7f2"
    );
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
