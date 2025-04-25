import { AppDataSource } from "../dataSource";
import { ConsultationCriteriaSection } from "../entities/consultationCriteriaSection.entity";
import { NotFoundError } from "../errors/error";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(ConsultationCriteriaSection);
class ConsultationCriteriaSectionService extends BaseService<ConsultationCriteriaSection> {
  constructor() {
    super(repository);
  }

  async delete(sectionId: string): Promise<boolean> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const sectionRepository = queryRunner.manager.getRepository(
        ConsultationCriteriaSection
      );

      const section = await sectionRepository.findOne({
        where: { id: sectionId },
        relations: ["consultationCriteria"],
      });

      if (!section) {
        throw new NotFoundError(`Section not found`);
      }

      const { consultationCriteria, orderIndex } = section;
      await sectionRepository.delete(sectionId);

      await sectionRepository
        .createQueryBuilder()
        .update(ConsultationCriteriaSection)
        .set({ orderIndex: () => "order_index - 1" })
        .where("consultation_criteria_id = :criteriaId", {
          criteriaId: consultationCriteria.id,
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
export const consultationCriteriaSectionService =
  new ConsultationCriteriaSectionService();
