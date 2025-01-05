import { AppDataSource } from '../dataSource';
import { CartItem } from '../entities/cartItem.entity';

export const cartRepository = AppDataSource.getRepository(CartItem);
