import { AppDataSource } from "../dataSource";
import { Question } from "../entities/question.entity";
import { ServiceBookingForm } from "../entities/serviceBookingForm.entity";
import { ServiceImage } from "../entities/serviceImage.entity";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(ServiceBookingForm);
class ServiceBookingFormService extends BaseService<ServiceBookingForm> {
  constructor() {
    super(repository);
  }

  async getAll(): Promise<ServiceBookingForm[]> {
    const serviceBookingForms = await this.repository
      .createQueryBuilder("serviceBookingForm")
      .leftJoinAndSelect(
        "serviceBookingForm.consultantServices",
        "consultantServices"
      )
      .leftJoinAndSelect("serviceBookingForm.questions", "questions")
      .leftJoinAndSelect("questions.images", "images")
      .getMany();

    return serviceBookingForms;
  }

  async getById(id: string): Promise<ServiceBookingForm> {
    const serviceBookingForm = await this.repository
      .createQueryBuilder("serviceBookingForm")
      .leftJoinAndSelect(
        "serviceBookingForm.consultantServices",
        "consultantServices"
      )
      .leftJoinAndSelect("serviceBookingForm.questions", "questions")
      .leftJoinAndSelect("questions.images", "images")
      .where("serviceBookingForm.id = :id", { id })
      .getOne();
    return serviceBookingForm;
  }

  async create(data: any): Promise<ServiceBookingForm> {
    let form;
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //await this.beforeCreate(data);

      form = await queryRunner.manager.save(ServiceBookingForm, data);

      for (const question of data.questions) {
        question.serviceBookingForm = form;
        const questionRes = await queryRunner.manager.save(Question, question);

        if (question.images && question.images.length > 0) {
          for (const image of question.images) {
            await queryRunner.manager.save(ServiceImage, {
              ...image,
              question: questionRes,
            });
          }
        }
      }

      await queryRunner.commitTransaction();
      return form;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const serviceBookingFormService = new ServiceBookingFormService();
