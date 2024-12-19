import { In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { GroupProductRequest } from '../dtos/request/groupProduct.request';
import { GroupBuyingCriteria } from '../entities/groupBuyingCriteria.entity';
import { GroupProduct } from '../entities/groupProduct.entity';
import { Voucher } from '../entities/voucher.entity';
import { BadRequestError } from '../errors/error';
import { brandRepository } from '../repositories/brand.repository';
import { productRepository } from '../repositories/product.repository';
import { voucherRepository } from '../repositories/voucher.repository';
import { BaseService } from './base.service';
import { groupBuyingRepository } from '../repositories/groupBuying.repository';
import { StatusEnum, VoucherEnum } from '../utils/enum';
import { GroupBuyingRequest } from '../dtos/request/groupBuying.request';
import { GroupBuying } from '../entities/groupBuying.entity';
import { accountRepository } from '../repositories/account.repository';

const repository = AppDataSource.getRepository(GroupProduct);
class GroupProductService extends BaseService<GroupProduct> {
  async startEvent(groupBuyingBody: GroupBuyingRequest, loginUser: string) {
    const groupProduct = await repository.findOne({
      where: { id: groupBuyingBody.groupProductId },
      relations: { criterias: true },
    });
    if (!groupProduct) throw new BadRequestError('Group product not found');
    const groupBuyingCriteria = groupProduct.criterias.find(
      (criteria) => criteria.id === groupBuyingBody.criteriaId
    );
    if (!groupBuyingCriteria)
      throw new BadRequestError('Criteria not in group product');
    const newGroupBuying = new GroupBuying();
    newGroupBuying.startTime = groupBuyingBody.startTime;
    newGroupBuying.endTime = groupBuyingBody.endTime;
    newGroupBuying.criteria = groupBuyingCriteria;
    const creator = await accountRepository.findOne({
      where: { id: loginUser },
    });
    newGroupBuying.creator = creator;
    newGroupBuying.groupProduct = groupProduct;
    await groupBuyingRepository.save(newGroupBuying);
  }
  async isInAnyEvents(groupProductId: string) {
    const currentTime = new Date();

    const groupBuying = await groupBuyingRepository.findOne({
      where: {
        groupProduct: { id: groupProductId },
        startTime: LessThanOrEqual(currentTime),
        endTime: MoreThanOrEqual(currentTime),
        status: StatusEnum.ACTIVE,
      },
    });
    return groupBuying !== null;
  }
  async updateProducts(productIds: string[], groupProductId: string) {
    const products = await productRepository.find({
      where: { id: In(productIds) },
    });
    if (products.length != productIds.length) {
      throw new BadRequestError('Some products not found');
    }
    const groupProduct = await repository.findOne({
      where: { id: groupProductId },
      relations: { products: true },
    });
    if (!groupProduct) throw new BadRequestError('Group product not found');
    groupProduct.products = products;
    await repository.save(groupProduct);
  }

  async getAll() {
    return await repository.find({
      relations: {
        criterias: { voucher: true },
        products: true,
      },
    });
  }

  async createGroupProduct(groupProductBody: GroupProductRequest) {
    const groupProduct = new GroupProduct();
    groupProduct.name = groupProductBody.name;
    groupProduct.description = groupProductBody.description;
    groupProduct.criterias = [];
    for (const criteria of groupProductBody.criterias) {
      const groupBuyingCriteria = new GroupBuyingCriteria();
      groupBuyingCriteria.threshold = criteria.threshold;
      // validate voucher
      if (
        new Date(criteria.voucher.startTime) >
        new Date(criteria.voucher.endTime)
      ) {
        throw new BadRequestError(
          'Voucher: The start time cannot be after the end time'
        );
      }
      const existVoucherByName = await voucherRepository.findOne({
        where: {
          name: criteria.voucher.name,
        },
      });
      if (existVoucherByName) {
        throw new BadRequestError('Voucher name already exists');
      }
      const existVoucherByCode = await voucherRepository.findOne({
        where: {
          code: criteria.voucher.code,
        },
      });
      if (existVoucherByCode) {
        throw new BadRequestError('Voucher code already exists');
      }
      const voucherBody = new Voucher();
      Object.assign(voucherBody, criteria.voucher);
      if (criteria.voucher.brandId) {
        const brand = await brandRepository.findOne({
          where: { id: groupProductBody.brandId },
        });
        if (!brand) throw new BadRequestError('Brand not found');
        voucherBody.brand = brand;
      }
      voucherBody.type = VoucherEnum.GROUP_BUYING;
      groupBuyingCriteria.voucher = voucherBody;
      groupProduct.criterias.push(groupBuyingCriteria);
    }
    const products = await productRepository.find({
      where: { id: In(groupProductBody.productIds) },
    });
    groupProduct.products = products;
    await repository.save(groupProduct);
  }

  constructor() {
    super(repository);
  }
}
export const groupProductService = new GroupProductService();
