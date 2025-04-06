import { AppDataSource } from "../dataSource";
import { Report } from "../entities/report.entity";

export const reportRepository = AppDataSource.getRepository(Report);
