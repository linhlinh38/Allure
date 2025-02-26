import { AppDataSource } from "../dataSource";
import { ConsultationCriteriaSection } from "../entities/consultationCriteriaSection.entity";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(ConsultationCriteriaSection);
class ConsultationCriteriaSectionService extends BaseService<ConsultationCriteriaSection> {
  constructor() {
    super(repository);
  }
}
export const consultationCriteriaSectionService =
  new ConsultationCriteriaSectionService();
