import { AppDataSource } from "../dataSource";
import { Address } from "../entities/address.entity";
import { Role } from "../entities/role.entity";
import { addressRepository } from "../repositories/address.repository";
import { BaseService } from "./base.service";

class AddressService extends BaseService<Address> {
  constructor() {
    super(addressRepository);
  }
}
export const addressService = new AddressService();
