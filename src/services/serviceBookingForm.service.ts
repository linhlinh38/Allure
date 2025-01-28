import { AppDataSource } from "../dataSource";
import { Question } from "../entities/question.entity";
import { ServiceBookingForm } from "../entities/serviceBookingForm.entity";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(ServiceBookingForm);
class ServiceBookingFormService extends BaseService<ServiceBookingForm> {
  constructor() {
    super(repository);
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
        await queryRunner.manager.save(Question, question);
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
