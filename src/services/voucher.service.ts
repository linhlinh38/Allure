import { Not } from 'typeorm';
import { AppDataSource } from '../dataSource';

import { BaseService } from './base.service';

import { Voucher } from '../entities/voucher.entity';
import { voucherRepository } from '../repositories/voucher.repository';
import { plainToInstance } from 'class-transformer';
import { VoucherResponse } from '../dtos/response/voucher.response';
import { BadRequestError } from '../errors/error';
import { SearchDTO } from '../dtos/other/search.dto';

class VoucherService extends BaseService<Voucher> {
  constructor() {
    super(voucherRepository);
  }
  async search(searches: SearchDTO[]) {
    const query = voucherRepository.createQueryBuilder('voucher');
    query.leftJoinAndSelect('voucher.brand', 'brand');

    searches.forEach((search) => {
      const { option, value } = search;

      switch (option) {
        case 'name':
          query.andWhere('voucher.name ILIKE :name', { name: `%${value}%` });
          break;
        case 'code':
          query.andWhere('voucher.code ILIKE :code', { code: `%${value}%` });
          break;
        case 'type':
          query.andWhere('voucher.type = :type', { type: value });
          break;
        case 'status':
          query.andWhere('voucher.status = :status', {
            status: value,
          });
          break;
        case 'brandId':
          query.andWhere('brand.id = :brandId', {
            brandId: value,
          });
          break;
        default:
          break;
      }
    });
    return await query.getMany();
  }

  async createVoucher(voucherBody: Voucher) {
    if (new Date(voucherBody.startTime) > new Date(voucherBody.endTime)) {
      throw new BadRequestError('The start time cannot be after the end time');
    }
    const existVoucherByName = await voucherRepository.findOne({
      where: {
        name: voucherBody.name,
      },
    });
    if (existVoucherByName) {
      throw new BadRequestError('Name already exists');
    }
    const existVoucherByCode = await voucherRepository.findOne({
      where: {
        code: voucherBody.code,
      },
    });
    if (existVoucherByCode) {
      throw new BadRequestError('Code already exists');
    }
    await this.create(voucherBody);
  }

  async updateDetail(id: string, voucherBody: Voucher) {
    const voucher = await voucherService.findById(id);
    if (!voucher) throw new BadRequestError('Voucher not found');
    if (new Date(voucherBody.startTime) > new Date(voucherBody.endTime)) {
      throw new BadRequestError('The start time cannot be after the end time');
    }
    if (new Date() < new Date(voucher.startTime)) {
      throw new BadRequestError(
        'Cannot update a voucher that is already started'
      );
    }
    const existVoucherByName = await voucherRepository.findOne({
      where: {
        name: voucherBody.name,
        id: Not(id),
      },
    });
    if (existVoucherByName) {
      throw new BadRequestError('Name already exists');
    }
    const existVoucherByCode = await voucherRepository.findOne({
      where: {
        code: voucherBody.code,
        id: Not(id),
      },
    });
    if (existVoucherByCode) {
      throw new BadRequestError('Code already exists');
    }
    await this.update(id, voucherBody);
  }

  async getAll() {
    const vouchers = voucherRepository.find({
      relations: {
        brand: true,
      },
    });
    return plainToInstance(VoucherResponse, vouchers);
  }

  async getById(id: string) {
    const voucher = await voucherRepository.findOne({
      where: { id },
      relations: {
        brand: true,
      },
    });
    if (!voucher) throw new BadRequestError('Voucher not found');
    return plainToInstance(VoucherResponse, voucher);
  }
}

export const voucherService = new VoucherService();
