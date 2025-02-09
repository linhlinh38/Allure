import { AppDataSource } from "../dataSource";
import { ResultSheet } from "../entities/resultSheet.entity";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(ResultSheet);
class ResultSheetService extends BaseService<ResultSheet> {
  constructor() {
    super(repository);
  }
}
export const questionService = new ResultSheetService();
