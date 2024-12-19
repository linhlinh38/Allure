import { AppDataSource } from "../dataSource";
import { Address } from "../entities/address.entity";
import { Role } from "../entities/role.entity";
import { addressRepository } from "../repositories/address.repository";
import { BaseService } from "./base.service";

class AddressService extends BaseService<Address> {
  constructor() {
    super(addressRepository);
  }

  async getMyAddress(accountId: string) {
    const address = await addressRepository.find({
      where: { account: { id: accountId } },
    });

    if (!address) {
      throw new Error("Address not found");
    }
    return address;
  }
}
export const addressService = new AddressService();
