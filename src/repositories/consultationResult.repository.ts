import { AppDataSource } from "../dataSource";
import { ConsultationResult } from "../entities/consultationResult.entity";

export const consultationResultRepository =
  AppDataSource.getRepository(ConsultationResult);
