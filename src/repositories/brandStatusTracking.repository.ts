import { AppDataSource } from "../dataSource";
import { StatusTracking } from "../entities/statusTracking.entity";

export const brandStatusTrackingRepository =
  AppDataSource.getRepository(StatusTracking);
