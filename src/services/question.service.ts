import { AppDataSource } from "../dataSource";
import { Question } from "../entities/question.entity";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(Question);
class QuestionService extends BaseService<Question> {
  constructor() {
    super(repository);
  }
}
export const questionService = new QuestionService();
