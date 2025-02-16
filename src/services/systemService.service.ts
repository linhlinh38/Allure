import { AppDataSource } from "../dataSource";
import { ResultSheet } from "../entities/resultSheet.entity";
import { ResultSheetSection } from "../entities/resultSheetSection.entity";
import { ServiceImage } from "../entities/serviceImage.entity";
import { SystemService } from "../entities/systemService.entity";
import { BadRequestError } from "../errors/error";
import { BaseService } from "./base.service";
import { categoryService } from "./category.service";

const repository = AppDataSource.getRepository(SystemService);
class SystemServiceService extends BaseService<SystemService> {
  constructor() {
    super(repository);
  }

  async getAll() {
    const services = await this.repository
      .createQueryBuilder("systemService")
      .leftJoinAndSelect("systemService.resultSheet", "resultSheet")
      .leftJoinAndSelect("systemService.images", "images")
      .leftJoinAndSelect("systemService.category", "category")
      .leftJoinAndSelect(
        "resultSheet.resultSheetSections",
        "resultSheetSections"
      )
      .getMany();

    return services;
  }

  async getById(id: string) {
    const services = await this.repository
      .createQueryBuilder("systemService")
      .leftJoinAndSelect("systemService.resultSheet", "resultSheet")
      .leftJoinAndSelect("systemService.images", "images")
      .leftJoinAndSelect("systemService.category", "category")
      .leftJoinAndSelect(
        "resultSheet.resultSheetSections",
        "resultSheetSections"
      )
      .where("systemService.id = :id", { id })
      .getMany();

    return services;
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

  async create(data: any): Promise<SystemService> {
    let service;
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.beforeCreate(data);

      const { resultSheetData, ...serviceData } = data;

      if (data.resultSheetData) {
        const sheet = await queryRunner.manager.save(
          ResultSheet,
          data.resultSheetData
        );

        for (const resultSheetSection of data.resultSheetData
          .resultSheetSections) {
          resultSheetSection.resultSheet = sheet;
          await queryRunner.manager.save(
            ResultSheetSection,
            resultSheetSection
          );
        }

        service = await queryRunner.manager.save(SystemService, {
          ...serviceData,
          resultSheet: sheet,
        });
      } else {
        service = await queryRunner.manager.save(SystemService, serviceData);
      }

      let images: ServiceImage[] = [];
      if (data.images && data.images.length > 0) {
        const systemServiceImages = data.images.map((image) => ({
          ...image,
          systemService: service,
        }));
        images = await queryRunner.manager.save(
          ServiceImage,
          systemServiceImages
        );
      }

      await queryRunner.commitTransaction();
      return service;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const systemServiceService = new SystemServiceService();
