import { AppDataSource } from '../dataSource';
import { Order } from '../entities/order.entity';

export const orderRepository = AppDataSource.getRepository(Order);
