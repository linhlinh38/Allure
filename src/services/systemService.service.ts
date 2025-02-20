import { AppDataSource } from "../dataSource";
import { ResultSheet } from "../entities/resultSheet.entity";
import { ResultSheetSection } from "../entities/resultSheetSection.entity";
import { ServiceImage } from "../entities/serviceImage.entity";
import { SystemService } from "../entities/systemService.entity";
import { BadRequestError, NotFoundError } from "../errors/error";
import { StatusEnum } from "../utils/enum";
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
      .getOne();

    return services;
  }

  async beforeCreate(body: SystemService) {
    const checkService = await this.findBy(body.name, "name");
    if (checkService.length > 0) {
      throw new BadRequestError("Service already Existed");
    }

    if (body.category) {
      const checkCategory = await categoryService.findById(body.category);
      if (!checkCategory) throw new NotFoundError("Category not found");
    }
  }

  async beforeUpdate(id: string, data: any) {
    const systemService = await this.repository.findOne({
      where: { id },
    });

    if (!systemService) {
      throw new NotFoundError("System service not found.");
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

  async update(id: string, data: any): Promise<SystemService> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.beforeUpdate(id, data);

      const systemServiceRepository =
        queryRunner.manager.getRepository(SystemService);
      const resultSheetRepository =
        queryRunner.manager.getRepository(ResultSheet);
      const resultSheetSectionRepository =
        queryRunner.manager.getRepository(ResultSheetSection);
      const serviceImageRepository =
        queryRunner.manager.getRepository(ServiceImage);

      const systemService = await this.getById(id);

      const { resultSheetData, images, ...serviceData } = data;

      if (resultSheetData) {
        let resultSheet;
        const { resultSheetSections, ...data } = resultSheetData;

        if (systemService.resultSheet && data.id) {
          await resultSheetRepository.update(data.id, data);
          resultSheet = await resultSheetRepository.findOne({
            where: { id: data.id },
          });
        } else {
          if (systemService.resultSheet) {
            await resultSheetRepository.update(systemService.resultSheet.id, {
              status: StatusEnum.INACTIVE,
            });
          }

          resultSheet = await resultSheetRepository.save(data);
          serviceData.resultSheet = resultSheet;
        }

        if (
          resultSheetData.resultSheetSections &&
          resultSheetData.resultSheetSections.length > 0
        ) {
          for (const section of resultSheetData.resultSheetSections) {
            section.resultSheet = resultSheet;

            let sectionRes;
            if (section.id) {
              await resultSheetSectionRepository.update(section.id, section);
              sectionRes = await resultSheetSectionRepository.findOne({
                where: { id: section.id },
              });
            } else {
              sectionRes = await resultSheetSectionRepository.save(section);
            }
          }
        }
      }

      await systemServiceRepository.update(id, serviceData);

      if (images && images.length > 0) {
        for (const image of images) {
          if (image.id) {
            await serviceImageRepository.update(image.id, image);
          } else {
            await serviceImageRepository.save({
              ...image,
              systemService,
            });
          }
        }
      }

      const updatedSystemService = await systemServiceRepository.findOne({
        where: { id },
        relations: ["resultSheet", "resultSheet.resultSheetSections", "images"],
      });
      await queryRunner.commitTransaction();
      return updatedSystemService!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const systemServiceService = new SystemServiceService();
