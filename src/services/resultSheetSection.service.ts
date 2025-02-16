import { AppDataSource } from "../dataSource";
import { ResultSheetSection } from "../entities/resultSheetSection.entity";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(ResultSheetSection);
class ResultSheetSectionService extends BaseService<ResultSheetSection> {
  constructor() {
    super(repository);
  }
}
export const questionService = new ResultSheetSectionService();
