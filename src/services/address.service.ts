import { AppDataSource } from "../dataSource";
import { Address } from "../entities/address.entity";
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

  async createAddress(data: any): Promise<Address> {
    const queryRunner = AppDataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let address;
      const accountAddress = await addressRepository.find({
        where: {
          account: { id: data.account },
        },
      });
      if (accountAddress.length === 0) {
        data.isDefault = true;
      }
      if (data.isDefault) {
        await queryRunner.manager.update(
          Address,
          { account: { id: data.account } },
          { isDefault: false }
        );
        address = await queryRunner.manager.save(Address, data);
      } else {
        address = await queryRunner.manager.save(Address, data);
      }
      await queryRunner.commitTransaction();
      return address;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async update(id: any, data: Partial<Address>): Promise<Address> {
    let address;
    if (data.isDefault) {
      address = await addressRepository.update(
        { account: { id: data.account.id } },
        { isDefault: false }
      );
    } else {
      address = await addressRepository.save(data);
    }
    return address;
  }
}
export const addressService = new AddressService();
