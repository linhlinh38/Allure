import { AppDataSource } from "../dataSource";
import { ConsultationCriteria } from "../entities/consultationCriteria.entity";
import { ConsultationCriteriaSection } from "../entities/consultationCriteriaSection.entity";
import { StatusEnum } from "../utils/enum";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(ConsultationCriteria);
class ConsultationCriteriaService extends BaseService<ConsultationCriteria> {
  constructor() {
    super(repository);
  }

  async getAll(): Promise<ConsultationCriteria[]> {
    const consultationCriterias = await this.repository
      .createQueryBuilder("consultationCriteria")
      .leftJoinAndSelect(
        "consultationCriteria.systemServices",
        "systemServices"
      )
      .leftJoinAndSelect(
        "consultationCriteria.consultationCriteriaSections",
        "consultationCriteriaSections"
      )
      .getMany();

    return consultationCriterias;
  }

  async getById(id: string): Promise<ConsultationCriteria> {
    const consultationCriteria = await this.repository
      .createQueryBuilder("consultationCriteria")
      .leftJoinAndSelect(
        "consultationCriteria.systemServices",
        "systemServices"
      )
      .leftJoinAndSelect(
        "consultationCriteria.consultationCriteriaSections",
        "consultationCriteriaSections"
      )
      .where("consultationCriteria.id = :id", { id })
      .getOne();

    return consultationCriteria;
  }

  async create(data: any): Promise<ConsultationCriteria> {
    let form;
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //await this.beforeCreate(data);

      const sheet = await queryRunner.manager.save(ConsultationCriteria, data);

      for (const section of data.consultationCriteriaSections) {
        section.consultationCriteria = sheet;
        const sectionRes = await queryRunner.manager.save(
          ConsultationCriteriaSection,
          section
        );
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

  async update(id: string, data: any): Promise<ConsultationCriteria> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const consultationCriteriaRepository =
        queryRunner.manager.getRepository(ConsultationCriteria);
      const consultationCriteriaSectionRepository =
        queryRunner.manager.getRepository(ConsultationCriteriaSection);

      const consultationCriteria = await consultationCriteriaRepository.findOne(
        {
          where: { id },
        }
      );

      if (!consultationCriteria) {
        throw new Error(`Consultation Criteria not found`);
      }

      const { consultationCriteriaSections, ...criteriaData } = data;

      await consultationCriteriaRepository.update(id, criteriaData);

      if (
        consultationCriteriaSections &&
        consultationCriteriaSections.length > 0
      ) {
        for (const section of consultationCriteriaSections) {
          let sectionRes;
          if (section.id) {
            await consultationCriteriaSectionRepository.update(
              section.id,
              section
            );
            sectionRes = section;
          } else {
            section.consultationCriteria = consultationCriteria;
            sectionRes = await consultationCriteriaSectionRepository.save(
              section
            );
          }
        }
      }

      const updatedConsultationCriteria =
        await consultationCriteriaRepository.findOne({
          where: { id },
          relations: ["consultationCriteriaSections"],
        });

      await queryRunner.commitTransaction();
      return updatedConsultationCriteria;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async updateConsultationCriteriaStatus(
    id: string,
    status: StatusEnum
  ): Promise<ConsultationCriteria> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const consultationCriteriaRepository =
        queryRunner.manager.getRepository(ConsultationCriteria);
      const consultationCriteriaSectionRepository =
        queryRunner.manager.getRepository(ConsultationCriteriaSection);

      const consultationCriteria = await consultationCriteriaRepository.findOne(
        {
          where: { id },
        }
      );

      if (!consultationCriteria) {
        throw new Error(`Consultation Criteria not found`);
      }

      await consultationCriteriaRepository.update(id, { status });

      if (status === StatusEnum.INACTIVE) {
        await consultationCriteriaSectionRepository.update(
          { consultationCriteria: { id } },
          { status: StatusEnum.INACTIVE }
        );
      }

      if (status === StatusEnum.BANNED) {
        await consultationCriteriaSectionRepository.update(
          { consultationCriteria: { id } },
          { status: StatusEnum.BANNED }
        );
      }

      if (status === StatusEnum.ACTIVE) {
        await consultationCriteriaSectionRepository.update(
          { consultationCriteria: { id } },
          { status: StatusEnum.ACTIVE }
        );
      }

      await queryRunner.commitTransaction();
      return consultationCriteria;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const consultationCriteriaService = new ConsultationCriteriaService();
