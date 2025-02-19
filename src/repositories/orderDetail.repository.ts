import { AppDataSource } from "../dataSource";
import { OrderDetail } from "../entities/orderDetail.entity";

export const orderDetailRepository = AppDataSource.getRepository(OrderDetail);
