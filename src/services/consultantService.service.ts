import { AppDataSource } from "../dataSource";
import { ConsultantService } from "../entities/consultantService.entity";
import { Question } from "../entities/question.entity";
import { ServiceBookingForm } from "../entities/serviceBookingForm.entity";
import { BadRequestError } from "../errors/error";
import { BaseService } from "./base.service";
import { categoryService } from "./category.service";

const repository = AppDataSource.getRepository(ConsultantService);
class ConsultantServiceService extends BaseService<ConsultantService> {
  constructor() {
    super(repository);
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
          question.serviceBookingForm = form;
          await queryRunner.manager.save(Question, question);
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
