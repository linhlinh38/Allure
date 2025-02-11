import { AppDataSource } from "../dataSource";
import { ConsultantService } from "../entities/consultantService.entity";
import { Question } from "../entities/question.entity";
import { ServiceBookingForm } from "../entities/serviceBookingForm.entity";
import { ServiceImage } from "../entities/serviceImage.entity";
import { BadRequestError } from "../errors/error";
import { BaseService } from "./base.service";
import { categoryService } from "./category.service";

const repository = AppDataSource.getRepository(ConsultantService);
class ConsultantServiceService extends BaseService<ConsultantService> {
  constructor() {
    super(repository);
  }

  async getAll() {
    const services = await this.repository
      .createQueryBuilder("consultantService")
      .leftJoinAndSelect("consultantService.systemService", "systemService")
      .leftJoinAndSelect("systemService.category", "category")
      .leftJoinAndSelect("consultantService.images", "images")
      .leftJoinAndSelect(
        "consultantService.serviceBookingForm",
        "serviceBookingForm"
      )
      .leftJoinAndSelect("serviceBookingForm.questions", "questions")
      .leftJoinAndSelect("questions.images", "questionImages")
      .getMany();

    return services;
  }

  async getAllServiceOfConsultant(account: string) {
    const services = await this.repository
      .createQueryBuilder("consultantService")
      .leftJoinAndSelect("consultantService.systemService", "systemService")
      .leftJoinAndSelect("systemService.category", "category")
      .leftJoinAndSelect("consultantService.images", "images")
      .leftJoinAndSelect(
        "consultantService.serviceBookingForm",
        "serviceBookingForm"
      )
      .leftJoinAndSelect("serviceBookingForm.questions", "questions")
      .leftJoinAndSelect("questions.images", "questionImages")
      .where("consultantService.account = :account", { account })
      .getMany();

    return services;
  }

  async getById(id: string) {
    const services = await this.repository
      .createQueryBuilder("consultantService")
      .leftJoinAndSelect("consultantService.systemService", "systemService")
      .leftJoinAndSelect("systemService.category", "category")
      .leftJoinAndSelect("consultantService.images", "images")
      .leftJoinAndSelect(
        "consultantService.serviceBookingForm",
        "serviceBookingForm"
      )
      .leftJoinAndSelect("serviceBookingForm.questions", "questions")
      .leftJoinAndSelect("questions.images", "questionImages")
      .where("consultantService.id = :id", { id })
      .getMany();

    return services;
  }

  async create(data: any): Promise<ConsultantService> {
    let service;
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //await this.beforeCreate(data);

      const { serviceBookingFormData, ...serviceData } = data;

      if (data.serviceBookingFormData) {
        const form = await queryRunner.manager.save(
          ServiceBookingForm,
          data.serviceBookingFormData
        );

        for (const question of data.serviceBookingFormData.questions) {
          const { images, ...questionFields } = question;
          questionFields.serviceBookingForm = form;
          const questionRes = await queryRunner.manager.save(
            Question,
            questionFields
          );

          if (question.images && question.images.length > 0) {
            for (const image of question.images) {
              await queryRunner.manager.save(ServiceImage, {
                ...image,
                question: questionRes,
              });
            }
          }
        }

        service = await queryRunner.manager.save(ConsultantService, {
          ...serviceData,
          serviceBookingForm: form,
        });
      } else {
        service = await queryRunner.manager.save(
          ConsultantService,
          serviceData
        );
      }

      let images: ServiceImage[] = [];
      if (data.images && data.images.length > 0) {
        const consultantImages = data.images.map((image) => ({
          ...image,
          consultantService: service,
        }));
        images = await queryRunner.manager.save(ServiceImage, consultantImages);
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
export const consultantServiceService = new ConsultantServiceService();
