import { AppDataSource } from "../dataSource";
import { ConsultantService } from "../entities/consultantService.entity";

export const consultantServiceRepository =
  AppDataSource.getRepository(ConsultantService);
