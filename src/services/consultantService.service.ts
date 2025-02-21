import { AppDataSource } from "../dataSource";
import { ConsultantService } from "../entities/consultantService.entity";
import { Question } from "../entities/question.entity";
import { ServiceBookingForm } from "../entities/serviceBookingForm.entity";
import { ServiceImage } from "../entities/serviceImage.entity";
import { BadRequestError, NotFoundError } from "../errors/error";
import { StatusEnum } from "../utils/enum";
import { BaseService } from "./base.service";
import { categoryService } from "./category.service";

const repository = AppDataSource.getRepository(ConsultantService);
class ConsultantServiceService extends BaseService<ConsultantService> {
  constructor() {
    super(repository);
  }

  async beforeUpdate(id: string, body: any) {
    const consultantService = await this.repository.findOne({
      where: { id },
    });

    const form = await this.repository.findOne({
      where: { id, serviceBookingForm: { id: body.serviceBookingFormData.id } },
    });

    if (!consultantService) {
      throw new NotFoundError("Consultant service not found.");
    }

    if (!form) {
      throw new NotFoundError("Booking Form not found.");
    }
  }

  async getAll() {
    const services = await this.repository
      .createQueryBuilder("consultantService")
      .leftJoinAndSelect("consultantService.systemService", "systemService")
      .leftJoinAndSelect("systemService.category", "category")
      .leftJoinAndSelect(
        "consultantService.images",
        "images",
        "images.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "consultantService.serviceBookingForm",
        "serviceBookingForm"
      )
      .leftJoinAndSelect(
        "serviceBookingForm.questions",
        "questions",
        "questions.status = :questionStatus",
        { questionStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "questions.images",
        "questionImages",
        "questionImages.status = :questionImageStatus",
        { questionImageStatus: StatusEnum.ACTIVE }
      )
      .getMany();

    return services;
  }

  async getAllServiceOfConsultant(account: string) {
    const services = await this.repository
      .createQueryBuilder("consultantService")
      .leftJoinAndSelect("consultantService.systemService", "systemService")
      .leftJoinAndSelect("systemService.category", "category")
      .leftJoinAndSelect(
        "consultantService.images",
        "images",
        "images.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "consultantService.serviceBookingForm",
        "serviceBookingForm"
      )
      .leftJoinAndSelect(
        "serviceBookingForm.questions",
        "questions",
        "questions.status = :questionStatus",
        { questionStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "questions.images",
        "questionImages",
        "questionImages.status = :questionImageStatus",
        { questionImageStatus: StatusEnum.ACTIVE }
      )
      .where("consultantService.account = :account", { account })
      .getMany();

    return services;
  }

  async getById(id: string) {
    const services = await this.repository
      .createQueryBuilder("consultantService")
      .leftJoinAndSelect("consultantService.systemService", "systemService")
      .leftJoinAndSelect("systemService.category", "category")
      .leftJoinAndSelect(
        "consultantService.images",
        "images",
        "images.status = :imageStatus",
        { imageStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "consultantService.serviceBookingForm",
        "serviceBookingForm"
      )
      .leftJoinAndSelect(
        "serviceBookingForm.questions",
        "questions",
        "questions.status = :questionStatus",
        { questionStatus: StatusEnum.ACTIVE }
      )
      .leftJoinAndSelect(
        "questions.images",
        "questionImages",
        "questionImages.status = :questionImageStatus",
        { questionImageStatus: StatusEnum.ACTIVE }
      )
      .where("consultantService.id = :id", { id })
      .getOne();

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

  async update(id: string, data: any): Promise<ConsultantService> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.beforeUpdate(id, data);

      const consultantServiceRepository =
        queryRunner.manager.getRepository(ConsultantService);
      const serviceBookingFormRepository =
        queryRunner.manager.getRepository(ServiceBookingForm);
      const questionRepository = queryRunner.manager.getRepository(Question);
      const serviceImageRepository =
        queryRunner.manager.getRepository(ServiceImage);

      const consultantService = await this.getById(id);

      const { serviceBookingFormData, images, ...serviceData } = data;

      if (serviceBookingFormData) {
        let form;
        const { questions, ...formFields } = serviceBookingFormData;
        if (consultantService.serviceBookingForm && formFields.id) {
          await serviceBookingFormRepository.update(formFields.id, formFields);
          form = await serviceBookingFormRepository.findOne({
            where: { id: formFields.id },
          });
        } else {
          await serviceBookingFormRepository.update(
            consultantService.serviceBookingForm.id,
            { status: StatusEnum.INACTIVE }
          );
          form = await serviceBookingFormRepository.save(formFields);
          serviceData.serviceBookingForm = form;
        }

        if (
          serviceBookingFormData.questions &&
          serviceBookingFormData.questions.length > 0
        ) {
          for (const question of serviceBookingFormData.questions) {
            const { images: questionImages, ...questionFields } = question;
            questionFields.serviceBookingForm = form;

            let questionRes;
            if (question.id) {
              await questionRepository.update(question.id, questionFields);
              questionRes = await questionRepository.findOne({
                where: { id: question.id },
              });
              console.log(questionRes);
            } else {
              questionRes = await questionRepository.save(questionFields);
            }

            if (questionImages && questionImages.length > 0) {
              for (const image of questionImages) {
                if (image.id) {
                  await serviceImageRepository.update(image.id, image);
                } else {
                  await serviceImageRepository.save({
                    ...image,
                    question: questionRes,
                  });
                }
              }
            }
          }
        }
      }

      await consultantServiceRepository.update(id, serviceData);

      if (images && images.length > 0) {
        for (const image of images) {
          if (image.id) {
            await serviceImageRepository.update(image.id, image);
          } else {
            await serviceImageRepository.save({
              ...image,
              consultantService,
            });
          }
        }
      }

      const updatedConsultantService =
        await consultantServiceRepository.findOne({
          where: { id },
          relations: [
            "serviceBookingForm",
            "serviceBookingForm.questions",
            "serviceBookingForm.questions.images",
            "images",
          ],
        });

      await queryRunner.commitTransaction();
      return updatedConsultantService!;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const consultantServiceService = new ConsultantServiceService();
