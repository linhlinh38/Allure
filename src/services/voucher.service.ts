import { Not } from 'typeorm';
import { AppDataSource } from '../dataSource';

import { BaseService } from './base.service';

import { Voucher } from '../entities/voucher.entity';
import { voucherRepository } from '../repositories/voucher.repository';
import { plainToInstance } from 'class-transformer';
import { VoucherResponse } from '../dtos/response/voucher.response';
import { BadRequestError } from '../errors/error';
import { SearchDTO } from '../dtos/other/search.dto';
import { DiscountTypeEnum, VoucherEnum } from '../utils/enum';
import { Order } from '../entities/order.entity';
import { orderRepository } from '../repositories/order.repository';
import { VoucherRequest } from '../dtos/request/voucher.request';
import { brandRepository } from '../repositories/brand.repository';

class VoucherService extends BaseService<Voucher> {
  constructor() {
    super(voucherRepository);
  }

  async validateShopVoucher(voucherId: string, accountId: string) {
    const shopVoucher = await voucherRepository.findOne({
      where: { id: voucherId },
      relations: {
        brand: true,
      },
    });
    if (!shopVoucher) throw new BadRequestError('Shop voucher not found');
    if (!shopVoucher.brand) {
      throw new BadRequestError('Shop voucher has no brand');
    }
    const now = new Date();
    let startTime = new Date(shopVoucher.startTime);
    let endTime = new Date(shopVoucher.endTime);
    if (now < startTime) {
      throw new BadRequestError('Shop voucher is not yet valid');
    }
    if (now > endTime) {
      throw new BadRequestError('Shop voucher has expired or is not yet valid');
    }
    if (shopVoucher.amount == 0) {
      throw new BadRequestError('Shop voucher is out of stock');
    }
    // Check if voucher was used in any order
    const existingOrder = await orderRepository.findOne({
      where: {
        account: { id: accountId },
        voucher: { id: voucherId },
      },
      relations: ['voucher', 'account'],
    });
    if (existingOrder) {
      throw new BadRequestError('Shop voucher has already been used');
    }
  }

  async validatePlatformVoucher(voucherId: string, accountId: string) {
    const platformVoucher = await voucherRepository.findOne({
      where: { id: voucherId },
      relations: { brand: true },
    });
    if (!platformVoucher)
      throw new BadRequestError('Platform voucher not found');
    if (platformVoucher.brand) {
      throw new BadRequestError('This is not a platform voucher');
    }
    const now = new Date();
    let startTime = new Date(platformVoucher.startTime);
    let endTime = new Date(platformVoucher.endTime);
    if (now < startTime) {
      throw new BadRequestError('Platform voucher is not yet valid');
    }
    if (now > endTime) {
      throw new BadRequestError(
        'Platform voucher has expired or is not yet valid'
      );
    }
    if (platformVoucher.amount == 0) {
      throw new BadRequestError('Platform voucher is out of stock');
    }
    // Check if voucher was used in any order
    const existingOrder = await orderRepository.findOne({
      where: {
        account: { id: accountId },
        voucher: { id: voucherId },
      },
      relations: ['voucher', 'account'],
    });
    if (existingOrder) {
      throw new BadRequestError('Platform voucher has already been used');
    }
  }

  applyShopVoucher(childOrder: Order) {
    const voucher = childOrder.voucher;
    console.log(voucher);

    let sumPrice = childOrder.orderDetails.reduce(
      (sum, orderDetail) => sum + orderDetail.subTotal,
      0
    );
    if (voucher.minOrderValue) {
      if (sumPrice < voucher.minOrderValue) {
        throw new BadRequestError(`Minimum order value is not enough`);
      }
    }
    if (voucher.discountType == DiscountTypeEnum.AMOUNT.toString()) {
      childOrder.orderDetails.forEach((orderDetail) => {
        orderDetail.shopVoucherDiscount = Math.round(Math.min(
          (orderDetail.subTotal / sumPrice) * voucher.discountValue,
          orderDetail.subTotal
        ));
        orderDetail.totalPrice =
          orderDetail.subTotal - orderDetail.shopVoucherDiscount;
      });
    } else if (voucher.discountType == DiscountTypeEnum.PERCENTAGE.toString()) {
      let discountValueToAmount = Math.round(sumPrice * voucher.discountValue);
      if (voucher.maxDiscount)
        discountValueToAmount = Math.min(
          discountValueToAmount,
          voucher.maxDiscount
        );

      childOrder.orderDetails.forEach((orderDetail) => {
        orderDetail.shopVoucherDiscount = Math.round(Math.min(
          (orderDetail.subTotal / sumPrice) * discountValueToAmount,
          orderDetail.subTotal
        ));
        orderDetail.totalPrice =
          orderDetail.subTotal - orderDetail.shopVoucherDiscount;
      });
    } else throw new BadRequestError(`Discount type voucher is not supported`);
  }

  applyPlatformVoucher(totalOrder: Order) {
    const voucher = totalOrder.voucher;
    const allOrderDetails = totalOrder.children.flatMap(
      (order) => order.orderDetails
    );
    let sumPrice = allOrderDetails.reduce(
      (sum, orderDetail) => sum + orderDetail.totalPrice,
      0
    );
    if (voucher.minOrderValue) {
      if (sumPrice < voucher.minOrderValue) {
        throw new BadRequestError(`Minimum order value is not enough`);
      }
    }
    if (voucher.discountType == DiscountTypeEnum.AMOUNT.toString()) {
      allOrderDetails.forEach((orderDetail) => {
        orderDetail.platformVoucherDiscount = Math.round(Math.min(
          (orderDetail.totalPrice / sumPrice) * voucher.discountValue,
          orderDetail.totalPrice
        ));
        orderDetail.totalPrice -= orderDetail.platformVoucherDiscount;
      });
    } else if (voucher.discountType == DiscountTypeEnum.PERCENTAGE.toString()) {
      let discountValueToAmount = Math.round(sumPrice * voucher.discountValue);
      if (voucher.maxDiscount)
        discountValueToAmount = Math.min(
          discountValueToAmount,
          voucher.maxDiscount
        );
      allOrderDetails.forEach((orderDetail) => {
        orderDetail.platformVoucherDiscount = Math.round(Math.min(
          (orderDetail.totalPrice / sumPrice) * discountValueToAmount,
          orderDetail.totalPrice
        ));
        orderDetail.totalPrice -= orderDetail.platformVoucherDiscount;
      });
    } else throw new BadRequestError(`Discount type voucher is not supported`);
  }

  calculateOrderPrice(totalOrder: Order) {
    totalOrder.subTotal = 0;
    totalOrder.totalPrice = 0;
    totalOrder.children.forEach((childOrder) => {
      childOrder.subTotal = 0;
      childOrder.totalPrice = 0;
      childOrder.orderDetails.forEach((orderDetail) => {
        childOrder.subTotal += orderDetail.subTotal;
        childOrder.totalPrice += orderDetail.totalPrice;
        childOrder.platformVoucherDiscount +=
          orderDetail.platformVoucherDiscount;
        childOrder.shopVoucherDiscount += orderDetail.shopVoucherDiscount;
      });
      totalOrder.subTotal += childOrder.subTotal;
      totalOrder.totalPrice += childOrder.totalPrice;
      totalOrder.platformVoucherDiscount += childOrder.platformVoucherDiscount;
      totalOrder.shopVoucherDiscount += childOrder.shopVoucherDiscount;
    });
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

  async createVoucher(voucherRequest: VoucherRequest) {
    if (new Date(voucherRequest.startTime) > new Date(voucherRequest.endTime)) {
      throw new BadRequestError('The start time cannot be after the end time');
    }
    const existVoucherByName = await voucherRepository.findOne({
      where: {
        name: voucherRequest.name,
      },
    });
    if (existVoucherByName) {
      throw new BadRequestError('Name already exists');
    }
    const existVoucherByCode = await voucherRepository.findOne({
      where: {
        code: voucherRequest.code,
      },
    });
    if (existVoucherByCode) {
      throw new BadRequestError('Code already exists');
    }
    const voucherBody = new Voucher();
    Object.assign(voucherBody, voucherRequest);
    if (voucherRequest.brandId) {
      const brand = await brandRepository.findOne({
        where: { id: voucherRequest.brandId },
      });
      if (!brand) throw new BadRequestError('Brand not found');
      voucherBody.brand = brand;
    }
    await this.create(voucherBody);
  }

  async updateDetail(id: string, voucherRequest: VoucherRequest) {
    const voucher = await voucherService.findById(id);
    if (!voucher) throw new BadRequestError('Voucher not found');
    if (new Date(voucherRequest.startTime) > new Date(voucherRequest.endTime)) {
      throw new BadRequestError('The start time cannot be after the end time');
    }
    if (new Date() < new Date(voucher.startTime)) {
      throw new BadRequestError(
        'Cannot update a voucher that is already started'
      );
    }
    const existVoucherByName = await voucherRepository.findOne({
      where: {
        name: voucherRequest.name,
        id: Not(id),
      },
    });
    if (existVoucherByName) {
      throw new BadRequestError('Name already exists');
    }
    const existVoucherByCode = await voucherRepository.findOne({
      where: {
        code: voucherRequest.code,
        id: Not(id),
      },
    });
    if (existVoucherByCode) {
      throw new BadRequestError('Code already exists');
    }
    Object.assign(voucher, voucherRequest);
    if (voucherRequest.brandId) {
      const brand = await brandRepository.findOne({
        where: { id: voucherRequest.brandId },
      });
      if (!brand) throw new BadRequestError('Brand not found');
      voucher.brand = brand;
    }
    await this.update(id, voucher);
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
