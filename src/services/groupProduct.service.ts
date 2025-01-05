import { In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../dataSource';
import {
  GroupProductCreateRequest,
  GroupProductUpdateRequest,
} from '../dtos/request/groupProduct.request';
import { GroupBuyingCriteria } from '../entities/groupBuyingCriteria.entity';
import { GroupProduct } from '../entities/groupProduct.entity';
import { Voucher } from '../entities/voucher.entity';
import { BadRequestError } from '../errors/error';
import { brandRepository } from '../repositories/brand.repository';
import { productRepository } from '../repositories/product.repository';
import { voucherRepository } from '../repositories/voucher.repository';
import { BaseService } from './base.service';
import { groupBuyingRepository } from '../repositories/groupBuying.repository';
import { StatusEnum, VoucherVisibilityEnum } from '../utils/enum';
import { GroupBuyingRequest } from '../dtos/request/groupBuying.request';
import { GroupBuying } from '../entities/groupBuying.entity';
import { accountRepository } from '../repositories/account.repository';
import { VoucherRequest } from '../dtos/request/voucher.request';
import { group } from 'console';
import { criteriaRepository } from '../repositories/criteria.repository';

const repository = AppDataSource.getRepository(GroupProduct);
class GroupProductService extends BaseService<GroupProduct> {
  async getById(groupProductId: string) {
    const groupProduct = await repository.findOne({
      where: { id: groupProductId },
      relations: {
        criterias: { voucher: true },
        products: true,
      },
    });
    if (!groupProduct) throw new BadRequestError('Group product not found');
    return groupProduct;
  }

  async toggleStatus(groupProductId: string) {
    const groupProduct = await repository.findOne({
      where: { id: groupProductId },
    });
    groupProduct.status =
      groupProduct.status == StatusEnum.ACTIVE
        ? StatusEnum.INACTIVE
        : StatusEnum.ACTIVE;
    await groupProduct.save();
    return groupProduct.status;
  }
  
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
  async updateGroup(
    groupProductUpdateBody: GroupProductUpdateRequest,
    groupProductId: string
  ) {
    const groupProduct = await repository.findOne({
      where: { id: groupProductId },
      relations: { products: true, criterias: true },
    });
    if (!groupProduct) throw new BadRequestError('Group product not found');
    if (groupProduct.status != StatusEnum.INACTIVE)
      throw new BadRequestError('Only update when status is Inactive');
    const products = await productRepository.find({
      where: { id: In(groupProductUpdateBody.productIds) },
    });
    if (products.length != groupProductUpdateBody.productIds.length) {
      throw new BadRequestError('Some products not found');
    }

    groupProduct.name = groupProductUpdateBody.name;
    groupProduct.description = groupProductUpdateBody.description;
    groupProduct.maxBuyAmountEachPerson =
      groupProductUpdateBody.maxBuyAmountEachPerson;
    groupProduct.products = products;
    //process criterias
    const chosenCriteriaIds = groupProductUpdateBody.criterias
      .map((criteria) => criteria.id)
      .filter((id) => !!id);
    groupProduct.criterias = await criteriaRepository.find({
      where: {
        id: In(chosenCriteriaIds),
      },
    });
    for (const criteria of groupProductUpdateBody.criterias) {
      if (criteria.id) {
        const findCriteria = groupProduct.criterias.find(
          (criteriaElement) => criteriaElement.id == criteria.id
        );
        if (findCriteria) {
          findCriteria.threshold = criteria.threshold;
        }
      } else {
        await this.addNewCriteria(
          criteria,
          groupProductUpdateBody,
          groupProduct
        );
      }
    }
    console.log(groupProduct);

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

  async createGroupProduct(groupProductBody: GroupProductCreateRequest) {
    const groupProduct = new GroupProduct();
    groupProduct.name = groupProductBody.name;
    groupProduct.description = groupProductBody.description;
    groupProduct.criterias = [];
    groupProduct.maxBuyAmountEachPerson =
      groupProductBody.maxBuyAmountEachPerson;
    const products = await productRepository.find({
      where: { id: In(groupProductBody.productIds) },
    });
    if (products.length != groupProductBody.productIds.length) {
      throw new BadRequestError('Some products not found');
    }
    for (const criteria of groupProductBody.criterias) {
      await this.addNewCriteria(criteria, groupProductBody, groupProduct);
    }
    groupProduct.products = products;
    return await repository.save(groupProduct);
  }

  private async addNewCriteria(
    criteria: { threshold: number; voucher: VoucherRequest; id?: string },
    groupProductBody: GroupProductCreateRequest | GroupProductUpdateRequest,
    groupProduct: GroupProduct
  ) {
    const groupBuyingCriteria = new GroupBuyingCriteria();
    groupBuyingCriteria.threshold = criteria.threshold;
    // validate voucher
    if (
      new Date(criteria.voucher.startTime) > new Date(criteria.voucher.endTime)
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
    voucherBody.visibility = VoucherVisibilityEnum.GROUP;
    groupBuyingCriteria.voucher = voucherBody;
    groupProduct.criterias.push(groupBuyingCriteria);
  }

  constructor() {
    super(repository);
  }
}
export const groupProductService = new GroupProductService();
