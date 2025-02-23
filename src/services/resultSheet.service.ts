import { AppDataSource } from "../dataSource";
import { ResultSheet } from "../entities/resultSheet.entity";
import { ResultSheetSection } from "../entities/resultSheetSection.entity";
import { ServiceImage } from "../entities/serviceImage.entity";
import { StatusEnum } from "../utils/enum";
import { BaseService } from "./base.service";

const repository = AppDataSource.getRepository(ResultSheet);
class ResultSheetService extends BaseService<ResultSheet> {
  constructor() {
    super(repository);
  }

  async getAll(): Promise<ResultSheet[]> {
    const resultSheets = await this.repository
      .createQueryBuilder("resultSheet")
      .leftJoinAndSelect("resultSheet.systemServices", "systemServices")
      .leftJoinAndSelect(
        "resultSheet.resultSheetSections",
        "resultSheetSections"
      )
      .getMany();

    return resultSheets;
  }

  async getById(id: string): Promise<ResultSheet> {
    const resultSheet = await this.repository
      .createQueryBuilder("resultSheet")
      .leftJoinAndSelect("resultSheet.systemServices", "systemServices")
      .leftJoinAndSelect(
        "resultSheet.resultSheetSections",
        "resultSheetSections"
      )
      .where("resultSheet.id = :id", { id })
      .getOne();

    return resultSheet;
  }

  async create(data: any): Promise<ResultSheet> {
    let form;
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      //await this.beforeCreate(data);

      const sheet = await queryRunner.manager.save(ResultSheet, data);

      for (const section of data.resultSheetSections) {
        section.resultSheet = sheet;
        const sectionRes = await queryRunner.manager.save(
          ResultSheetSection,
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

  async updateResultSheetStatus(
    id: string,
    status: StatusEnum
  ): Promise<ResultSheet> {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const resultSheetRepository =
        queryRunner.manager.getRepository(ResultSheet);
      const resultSheetSectionRepository =
        queryRunner.manager.getRepository(ResultSheetSection);

      const resultSheet = await resultSheetRepository.findOne({
        where: { id },
      });

      if (!resultSheet) {
        throw new Error(`Result Sheet with id ${id} not found`);
      }

      await resultSheetRepository.update(id, { status });

      if (status === StatusEnum.INACTIVE) {
        await resultSheetSectionRepository.update(
          { resultSheet: { id } },
          { status: StatusEnum.INACTIVE }
        );
      }

      if (status === StatusEnum.BANNED) {
        await resultSheetSectionRepository.update(
          { resultSheet: { id } },
          { status: StatusEnum.BANNED }
        );
      }

      if (status === StatusEnum.ACTIVE) {
        await resultSheetSectionRepository.update(
          { resultSheet: { id } },
          { status: StatusEnum.ACTIVE }
        );
      }

      await queryRunner.commitTransaction();
      return resultSheet;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
export const resultSheetService = new ResultSheetService();
