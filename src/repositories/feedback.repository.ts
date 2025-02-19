import { AppDataSource } from "../dataSource";
import { Feedback } from "../entities/feedback.entity";

export const feedbackRepository = AppDataSource.getRepository(Feedback);
