import { StatusTracking } from '../entities/statusTracking.entity';
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
import {
  BrandRequest,
  BrandUpdateStatusRequest,
} from '../dtos/request/brand.request';
import {
  BookingStatusEnum,
  BrandStatusEnum,
  FileEnum,
  RoleEnum,
} from '../utils/enum';
import { brandStatusTrackingRepository } from '../repositories/brandStatusTracking.repository';
import { File } from '../entities/file.entity';
import { retrieveMasterConfig } from '../utils/retrieveMasterConfig';
import { bookingRepository } from '../repositories/booking.repository';
import { sendConfirmActiveBrandEmail } from './mail.service';
import { FilterBrandRequest } from '../dtos/request/brand.request';
import { Paging } from '../dtos/other/paging.dto';

const repository = AppDataSource.getRepository(Brand);
class BrandService extends BaseService<Brand> {
  async getAll() {
    return await repository.find({
      relations: {
        documents: true,
        reviewer: true,
      },
    });
  }
  async assignInterview(brandId: string, reviewerId: string) {
    const brand = await repository.findOne({
      where: { id: brandId },
    });
    if (!brand) throw new BadRequestError('Brand not found');
    const assignee = await accountRepository.findOne({
      where: { id: reviewerId },
    });
    if (!assignee) throw new BadRequestError('Assignee not found');
    brand.reviewer = assignee;
    await repository.save(brand);
  }
  async getById(id: string) {
    const brand = await repository.findOne({
      where: { id },
      relations: {
        documents: true,
        reviewer: true,
      },
    });
    if (!brand) throw new BadRequestError('Brand not found');
    return brand;
  }
  async getStatusTrackings(brandId: string) {
    const brand = await brandRepository.findOne({
      where: { id: brandId },
    });
    if (!brand) throw new BadRequestError('Brand not found');
    const statusTrackings = await brandStatusTrackingRepository.find({
      relations: { brand: true, updatedBy: true },
      where: { brand: { id: brandId } },
      order: { createdAt: 'DESC' },
    });
    return statusTrackings;
  }
  async updateStatus(
    loginUser: string,
    brandUpdateStatusRequest: BrandUpdateStatusRequest
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const account = await accountRepository.findOne({
        where: { id: loginUser },
      });
      const brand = await brandRepository.findOne({
        where: { id: brandUpdateStatusRequest.brandId },
        relations: {
          accounts: {
            role: true,
          },
        },
      });
      if (!brand) throw new BadRequestError('Brand not found');
      if (brand.status == brandUpdateStatusRequest.status)
        throw new BadRequestError(`Status is already ${brand.status}`);
      if (
        [
          BrandStatusEnum.DENIED,
          BrandStatusEnum.NEED_ADDITIONAL_DOCUMENTS,
        ].includes(brandUpdateStatusRequest.status) &&
        !brandUpdateStatusRequest.reason
      ) {
        throw new BadRequestError('Reason is required');
      }
      if (
        brandUpdateStatusRequest.status ==
        BrandStatusEnum.NEED_ADDITIONAL_DOCUMENTS
      ) {
        const masterConfig = await retrieveMasterConfig();
        if (
          brand.currentUpdateProfileTime ==
          masterConfig.maximumUpdateBrandProfileTime
        ) {
          throw new BadRequestError(
            `You can only update profile ${brand.currentUpdateProfileTime} times`
          );
        }
        brand.currentUpdateProfileTime++;
      }
      if (brandUpdateStatusRequest.status == BrandStatusEnum.DONE_MEETING) {
        const bookings = await bookingRepository.find({
          where: {
            account,
            status: BookingStatusEnum.BOOKING_CONFIRMED,
          },
          order: {
            createdAt: 'DESC',
          },
        });
        const booking = bookings.length > 0 && bookings[0];
        if (!booking) {
          throw new BadRequestError('No booking found');
        }
        booking.status = BookingStatusEnum.COMPLETED;
        await queryRunner.manager.save(booking);
      }
      if (brandUpdateStatusRequest.status == BrandStatusEnum.ACTIVE) {
        if (!brandUpdateStatusRequest.url)
          throw new BadRequestError('Url required');
      }
      brand.status = brandUpdateStatusRequest.status;
      await queryRunner.manager.save(Brand, brand);

      const statusTracking = new StatusTracking();
      statusTracking.reason = brandUpdateStatusRequest.reason;
      statusTracking.status = brandUpdateStatusRequest.status.toString();
      statusTracking.updatedBy = account;
      statusTracking.brand = brand;

      await queryRunner.manager.save(StatusTracking, statusTracking);

      if (brandUpdateStatusRequest.status == BrandStatusEnum.ACTIVE) {
        const manager = brand.accounts.find(
          (account) => account.role.role == RoleEnum.MANAGER
        );
        if (!manager) throw new BadRequestError('Manager not found');
        sendConfirmActiveBrandEmail(
          manager.email,
          brand.name,
          brandUpdateStatusRequest.url
        );
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

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

  async requestCreateBrand(managerId: string, brandRequest: BrandRequest) {
    const existBrandByName = await brandRepository.findOneBy({
      ['name']: brandRequest.name,
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

    const brand = new Brand();
    Object.assign(brand, brandRequest);
    delete brand.documents;
    brand.documents = brandRequest.documents.map((doc) => {
      const file = new File();
      file.fileUrl = doc;
      file.type = FileEnum.BRAND_DOCUMENT;
      return file;
    });
    brand.accounts = [manager];
    return await brandRepository.save(brand);
  }

  async updateDetail(id: string, brandRequest: BrandRequest) {
    const brand: Brand = await brandService.findById(id);
    if (!brand) throw new BadRequestError('Brand not found');
    const existBrandByName = await brandRepository.findOne({
      where: {
        name: brandRequest.name,
        id: Not(id),
      },
    });
    if (existBrandByName) {
      throw new BadRequestError('Name already exists');
    }
    if (brand.status != BrandStatusEnum.NEED_ADDITIONAL_DOCUMENTS) {
      throw new BadRequestError("Can't update brand due to current status");
    }
    brand.status = BrandStatusEnum.PENDING_REVIEW;
    Object.assign(brand, brandRequest);
    delete brand.documents;
    if (brandRequest.documents && brandRequest.documents.length > 0) {
      brand.documents = brandRequest.documents.map((doc) => {
        const file = new File();
        file.fileUrl = doc;
        file.type = FileEnum.BRAND_DOCUMENT;
        return file;
      });
    }
    await brand.save();
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
        brand: true,
      },
    });
    return follows.flatMap((follow) => [follow.brand]);
  }

  async filter(filterRequest: FilterBrandRequest, paging: Paging) {
    const { name, reviewerId, status } = filterRequest;
    const { page, limit } = paging;
    const offset = (page - 1) * limit;

    const queryBuilder = brandRepository
      .createQueryBuilder('brand')
      .leftJoinAndSelect('brand.documents', 'documents')
      .leftJoinAndSelect('brand.reviewer', 'reviewer');

    // Apply filters
    if (name) {
      queryBuilder.andWhere('LOWER(brand.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
      });
    }

    if (reviewerId) {
      queryBuilder.andWhere('reviewer.id = :reviewerId', { reviewerId });
    }

    if (status) {
      queryBuilder.andWhere('brand.status = :status', { status });
    }

    // Get total count
    const totalBrands = await queryBuilder.getCount();

    // Get paginated results
    const brands = await queryBuilder
      .orderBy('brand.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    return {
      total: totalBrands,
      totalPages: Math.ceil(totalBrands / limit),
      items: brands,
    };
  }
}

export const brandService = new BrandService();
