import { AppDataSource } from "../dataSource";
import { Question } from "../entities/question.entity";
import { ServiceImage } from "../entities/serviceImage.entity";
import { NotFoundError } from "../errors/error";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(Question);
class QuestionService extends BaseService<Question> {
  constructor() {
    super(repository);
  }

  async delete(questionId: string): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const questionRepository = queryRunner.manager.getRepository(Question);
      const serviceImageRepository =
        queryRunner.manager.getRepository(ServiceImage);

      const question = await questionRepository.findOne({
        where: { id: questionId },
        relations: ["serviceBookingForm", "images"],
      });

      if (!question) {
        throw new NotFoundError(`Question not found`);
      }

      const { serviceBookingForm, orderIndex } = question;

      if (question.images && question.images.length > 0) {
        for (const image of question.images) {
          await serviceImageRepository.delete(image.id);
        }
      }
      await questionRepository.delete(questionId);

      await questionRepository
        .createQueryBuilder()
        .update(Question)
        .set({ orderIndex: () => "order_index - 1" })
        .where("service_booking_form_id = :formId", {
          formId: serviceBookingForm.id,
        })
        .andWhere("order_index > :orderIndex", { orderIndex })
        .execute();

      await queryRunner.commitTransaction();
      return true;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const questionService = new QuestionService();
