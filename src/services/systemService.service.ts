import { Not } from "typeorm";
import { AppDataSource } from "../dataSource";
import { ConsultationCriteria } from "../entities/consultationCriteria.entity";
import { ConsultationCriteriaSection } from "../entities/consultationCriteriaSection.entity";
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
      .leftJoinAndSelect(
        "systemService.consultationCriteria",
        "consultationCriteria"
      )
      .leftJoinAndSelect("systemService.images", "images")
      .leftJoinAndSelect("systemService.category", "category")
      .leftJoinAndSelect("category.parentCategory", "parentCategory")
      .leftJoinAndSelect(
        "consultationCriteria.consultationCriteriaSections",
        "consultationCriteriaSections"
      )
      .getMany();

    return services;
  }

  async getById(id: string) {
    const services = await this.repository
      .createQueryBuilder("systemService")
      .leftJoinAndSelect(
        "systemService.consultationCriteria",
        "consultationCriteria"
      )
      .leftJoinAndSelect("systemService.images", "images")
      .leftJoinAndSelect("systemService.category", "category")
      .leftJoinAndSelect("category.parentCategory", "parentCategory")
      .leftJoinAndSelect(
        "consultationCriteria.consultationCriteriaSections",
        "consultationCriteriaSections"
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

      const { consultationCriteriaData, ...serviceData } = data;

      if (data.consultationCriteriaData) {
        const sheet = await queryRunner.manager.save(
          ConsultationCriteria,
          data.consultationCriteriaData
        );

        for (const consultationCriteriaSection of data.consultationCriteriaData
          .consultationCriteriaSections) {
          consultationCriteriaSection.consultationCriteria = sheet;
          await queryRunner.manager.save(
            ConsultationCriteriaSection,
            consultationCriteriaSection
          );
        }

        service = await queryRunner.manager.save(SystemService, {
          ...serviceData,
          consultationCriteria: sheet,
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
      const consultationCriteriaRepository =
        queryRunner.manager.getRepository(ConsultationCriteria);
      const consultationCriteriaSectionRepository =
        queryRunner.manager.getRepository(ConsultationCriteriaSection);
      const serviceImageRepository =
        queryRunner.manager.getRepository(ServiceImage);

      const systemService = await this.getById(id);

      const { consultationCriteriaData, images, ...serviceData } = data;

      if (consultationCriteriaData) {
        let consultationCriteria;
        const { consultationCriteriaSections, ...data } =
          consultationCriteriaData;

        if (systemService.consultationCriteria && data.id) {
          await consultationCriteriaRepository.update(data.id, data);
          consultationCriteria = await consultationCriteriaRepository.findOne({
            where: { id: data.id },
          });
        } else {
          if (systemService.consultationCriteria) {
            await consultationCriteriaRepository.update(
              systemService.consultationCriteria.id,
              {
                status: StatusEnum.INACTIVE,
              }
            );
          }

          consultationCriteria = await consultationCriteriaRepository.save(
            data
          );
          serviceData.consultationCriteria = consultationCriteria;
        }

        if (
          consultationCriteriaData.consultationCriteriaSections &&
          consultationCriteriaData.consultationCriteriaSections.length > 0
        ) {
          for (const section of consultationCriteriaData.consultationCriteriaSections) {
            section.consultationCriteria = consultationCriteria;

            let sectionRes;
            if (section.id) {
              await consultationCriteriaSectionRepository.update(
                section.id,
                section
              );
              sectionRes = await consultationCriteriaSectionRepository.findOne({
                where: { id: section.id },
              });
            } else {
              sectionRes = await consultationCriteriaSectionRepository.save(
                section
              );
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
        relations: [
          "consultationCriteria",
          "consultationCriteria.consultationCriteriaSections",
          "images",
        ],
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

  async updateStatus(id: string, status: StatusEnum): Promise<SystemService> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const systemServiceRepository =
        queryRunner.manager.getRepository(SystemService);
      const consultationCriteriaRepository =
        queryRunner.manager.getRepository(ConsultationCriteria);
      const consultationCriteriaSectionRepository =
        queryRunner.manager.getRepository(ConsultationCriteriaSection);

      const systemService = await systemServiceRepository.findOne({
        where: { id },
        relations: [
          "consultationCriteria",
          "consultationCriteria.consultationCriteriaSections",
        ],
      });

      if (!systemService) {
        throw new NotFoundError("System service not found.");
      }

      if (status === StatusEnum.INACTIVE) {
        const activeServicesUsingCriteria = await systemServiceRepository.count(
          {
            where: {
              consultationCriteria: {
                id: systemService.consultationCriteria.id,
              },
              status: StatusEnum.ACTIVE,
              id: Not(id),
            },
          }
        );
        if (activeServicesUsingCriteria === 0) {
          await consultationCriteriaRepository.update(
            systemService.consultationCriteria.id,
            { status: StatusEnum.INACTIVE }
          );

          for (const section of systemService.consultationCriteria
            .consultationCriteriaSections) {
            await consultationCriteriaSectionRepository.update(section.id, {
              status: StatusEnum.INACTIVE,
            });
          }
        }
      } else if (status === StatusEnum.ACTIVE) {
        await consultationCriteriaRepository.update(
          systemService.consultationCriteria.id,
          { status: StatusEnum.ACTIVE }
        );

        for (const section of systemService.consultationCriteria
          .consultationCriteriaSections) {
          await consultationCriteriaSectionRepository.update(section.id, {
            status: StatusEnum.ACTIVE,
          });
        }
      }

      await systemServiceRepository.update(id, { status });

      const updatedSystemService = await systemServiceRepository.findOne({
        where: { id },
        relations: [
          "consultationCriteria",
          "consultationCriteria.consultationCriteriaSections",
          "images",
        ],
      });
      await queryRunner.commitTransaction();
      return updatedSystemService;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const systemServiceService = new SystemServiceService();
