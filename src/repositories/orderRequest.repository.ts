import { AppDataSource } from "../dataSource";
import { OrderRequest } from "../entities/orderRequest.entity";

export const orderRequestRepository = AppDataSource.getRepository(OrderRequest);
