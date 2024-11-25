import { Not } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { SearchDTO } from '../dtos/other/search.dto';
import { Brand } from '../entities/brand.entity';
import { BadRequestError } from '../errors/error';
import { accountRepository } from '../repositories/account.repository';
import { brandRepository } from '../repositories/brand.repository';
import { BaseService } from './base.service';
import { followRepository } from '../repositories/follow.repository';
import { accountService } from './account.service';
import { Voucher } from '../entities/voucher.entity';

const repository = AppDataSource.getRepository(Brand);
class BrandService extends BaseService<Brand> {
  constructor() {
    super(repository);
  }

  async search(searches: SearchDTO[]) {
    const query = repository.createQueryBuilder('brand');

    searches.forEach((search) => {
      const { option, value } = search;

      switch (option) {
        case 'name':
          query.andWhere('brand.name ILIKE :name', { name: `%${value}%` });
          break;
        case 'status':
          query.andWhere('brand.status = :status', { status: value });
          break;
        case 'email':
          query.andWhere('brand.email = :email', { email: value });
          break;
        case 'address':
          query.andWhere('brand.address ILIKE :address', {
            address: `%${value}%`,
          });
          break;
        default:
          break;
      }
    });
    return await query.getMany();
  }

  async requestCreateBrand(managerId: string, brand: Brand) {
    const existBrandByName = await brandRepository.findOneBy({
      ['name']: brand.name,
    });
    if (existBrandByName) {
      throw new BadRequestError('Name already exists');
    }
    const manager = await accountRepository.findOne({
      where: { id: managerId },
    });

    if (!manager) {
      throw new BadRequestError('Manager not found');
    }

    const newBrand = brandRepository.create(brand);
    newBrand.accounts = [manager];

    return await brandRepository.save(newBrand);
  }

  async updateDetail(id: string, brandBody: Brand) {
    const brand: Brand = await brandService.findById(id);
    if (!brand) throw new BadRequestError('Brand not found');
    const existBrandByName = await brandRepository.findOne({
      where: {
        name: brandBody.name,
        id: Not(id),
      },
    });
    if (existBrandByName) {
      throw new BadRequestError('Name already exists');
    }
    await this.update(id, brandBody);
  }

  async toggleFollowBrand(accountId: string, brandId: string) {
    const existingFollow = await followRepository.findOne({
      where: {
        account: { id: accountId },
        brand: { id: brandId },
      },
    });
    if (existingFollow) {
      await followRepository.remove(existingFollow);
    } else {
      const account = await accountService.findById(accountId);
      if (!account) throw new BadRequestError('Account not found');
      const brand = await brandService.findById(brandId);
      if (!brand) throw new BadRequestError('Brand not found');
      const newFollow = followRepository.create({ account, brand });
      await followRepository.save(newFollow);
    }
  }

  async getFollowedBrands(accountId: string) {
    const account = await accountService.findById(accountId);
    if (!account) throw new BadRequestError('Account not found');
    const follows = await followRepository.find({
      where: { account: { id: accountId } },
      relations: {
        brand: true
      }
    });
    return follows.flatMap(follow => [follow.brand]);
  }
}

export const brandService = new BrandService();
