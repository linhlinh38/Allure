import { In, MoreThanOrEqual, Not } from 'typeorm';
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
import { criteriaRepository } from '../repositories/criteria.repository';
import { addGroupBuyingToQueue } from '../utils/queue/endGrBuyingQueue';
import {
  FilterGroupProductRequest,
  FilterGroupProductPaging,
} from '../dtos/request/groupProduct.request';

const repository = AppDataSource.getRepository(GroupProduct);
class GroupProductService extends BaseService<GroupProduct> {
  async getBrandsHaveGroupProducts() {
    return await brandRepository
      .createQueryBuilder('brand')
      .innerJoin('brand.products', 'product') // Lấy Brand có Product
      .innerJoin('product.groupProducts', 'groupProduct') // Lấy Product thuộc ít nhất một GroupProduct
      .distinct(true) // Tránh trùng lặp Brand
      .getMany();
  }
  async getByBrand(brandId: string, status: StatusEnum) {
    if (!status)
      return await repository.find({
        where: {
          products: {
            brand: { id: brandId },
          },
        },
        relations: {
          products: { images: true, productClassifications: { images: true } },
          criterias: { voucher: true },
        },
      });
    return await repository.find({
      where: {
        products: {
          brand: { id: brandId },
        },
        status,
      },
      relations: {
        products: { images: true, productClassifications: { images: true } },
      },
    });
  }

  async getByStatus(status: StatusEnum) {
    if (!status)
      return await repository.find({
        relations: {
          products: { images: true, productClassifications: { images: true } },
        },
      });
    return await repository.find({
      where: { status: status },
      relations: {
        products: { images: true, productClassifications: { images: true } },
      },
    });
  }

  async getById(groupProductId: string) {
    const groupProduct = await repository.findOne({
      where: { id: groupProductId },
      relations: {
        criterias: { voucher: true },
        products: { images: true, productClassifications: { images: true } },
      },
    });
    if (!groupProduct) throw new BadRequestError('Group product not found');
    return groupProduct;
  }

  async toggleStatus(groupProductId: string) {
    const groupProduct = await repository.findOne({
      where: { id: groupProductId },
    });
    if (!groupProduct) throw new BadRequestError('Group product not found');
    const groupBuying = await groupBuyingRepository.findOne({
      where: {
        groupProduct: { id: groupProductId },
        endTime: MoreThanOrEqual(new Date()),
      },
    });
    if (groupBuying) throw new BadRequestError('Group product is in event');
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
    if (groupProduct.status != StatusEnum.ACTIVE)
      throw new BadRequestError('Group product is inactive');
    const newGroupBuying = new GroupBuying();
    newGroupBuying.endTime = new Date(groupBuyingBody.endTime);
    if (newGroupBuying.endTime.getTime() < Date.now())
      throw new BadRequestError('End time must after current time');
    const creator = await accountRepository.findOne({
      where: { id: loginUser },
    });
    newGroupBuying.creator = creator;
    newGroupBuying.groupProduct = groupProduct;
    const createdGroupBuying = await groupBuyingRepository.save(newGroupBuying);
    await addGroupBuyingToQueue(
      createdGroupBuying.id,
      createdGroupBuying.endTime.getTime() - Date.now()
    );
    return createdGroupBuying;
  }

  async isInAnyEvents(groupProductId: string) {
    const currentTime = new Date();

    const groupBuying = await groupBuyingRepository.findOne({
      where: {
        groupProduct: { id: groupProductId },
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
      relations: {
        voucher: true,
      },
    });
    for (const criteria of groupProductUpdateBody.criterias) {
      if (criteria.id) {
        const findCriteria = groupProduct.criterias.find(
          (criteriaElement) => criteriaElement.id == criteria.id
        );
        if (findCriteria) {
          findCriteria.threshold = criteria.threshold;
          if (criteria.voucher)
            findCriteria.voucher = await this.updateVoucherInGroup(
              criteria.voucher,
              findCriteria.voucher
            );
        }
      } else {
        await this.addNewCriteria(
          criteria,
          groupProductUpdateBody,
          groupProduct
        );
      }
    }
    await repository.save(groupProduct);
  }

  async updateVoucherInGroup(voucherRequest: VoucherRequest, voucher: Voucher) {
    // validate voucher
    const existVoucherByName = await voucherRepository.findOne({
      where: {
        id: Not(voucher.id),
        name: voucherRequest.name,
      },
    });
    if (existVoucherByName) {
      throw new BadRequestError('Voucher name already exists');
    }
    const existVoucherByCode = await voucherRepository.findOne({
      where: {
        id: Not(voucher.id),
        code: voucherRequest.code,
      },
    });
    if (existVoucherByCode) {
      throw new BadRequestError('Voucher code already exists');
    }
    Object.assign(voucher, voucherRequest);
    voucher.visibility = VoucherVisibilityEnum.GROUP;
    return voucher;
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
    const brand = await brandRepository.findOne({
      where: {
        id: groupProductBody.brandId,
      },
    });
    if (!brand) throw new BadRequestError(`Brand not found`);
    const groupProduct = new GroupProduct();
    groupProduct.name = groupProductBody.name;
    groupProduct.description = groupProductBody.description;
    groupProduct.criterias = [];
    groupProduct.maxBuyAmountEachPerson =
      groupProductBody.maxBuyAmountEachPerson;
    groupProduct.brand = brand;
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

  async filter(
    filterRequest: FilterGroupProductRequest,
    paging: FilterGroupProductPaging
  ) {
    const { productIds, name, statuses, brandId } = filterRequest;
    const { page, limit } = paging;
    const offset = (page - 1) * limit;

    const queryBuilder = repository
      .createQueryBuilder('groupProduct')
      .leftJoinAndSelect('groupProduct.products', 'products')
      .leftJoinAndSelect('groupProduct.criterias', 'criterias')
      .leftJoinAndSelect('criterias.voucher', 'voucher')
      .leftJoinAndSelect('groupProduct.brand', 'brand');

    // Apply filters
    if (productIds && productIds.length > 0) {
      queryBuilder.andWhere('products.id IN (:...productIds)', { productIds });
    }

    if (name) {
      queryBuilder.andWhere('LOWER(groupProduct.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
      });
    }

    if (statuses && statuses.length > 0) {
      queryBuilder.andWhere('groupProduct.status IN (:...statuses)', {
        statuses,
      });
    }

    if (brandId) {
      queryBuilder.andWhere('brand.id = :brandId', { brandId });
    }

    // Get total count
    const totalGroupProducts = await queryBuilder.getCount();

    // Get paginated results
    const groupProducts = await queryBuilder
      .orderBy('groupProduct.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return {
      total: totalGroupProducts,
      totalPages: Math.ceil(totalGroupProducts / limit),
      items: groupProducts,
    };
  }

  constructor() {
    super(repository);
  }
}
export const groupProductService = new GroupProductService();
