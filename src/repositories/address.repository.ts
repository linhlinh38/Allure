import { AppDataSource } from "../dataSource";
import { Address } from "../entities/address.entity";

export const addressRepository = AppDataSource.getRepository(Address);
