import { ILike, IsNull, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { BadRequestError } from '../errors/error';
import { BaseService } from './base.service';
import { Order } from '../entities/order.entity';
import {
  OrderNormalRequest,
  PreOrderRequest,
} from '../dtos/request/order.request';
import { voucherRepository } from '../repositories/voucher.repository';
import { productClassificationRepository } from '../repositories/productClassification.repository';
import { productDiscountRepository } from '../repositories/productDiscount.repository';
import { Voucher } from '../entities/voucher.entity';
import { voucherService } from './voucher.service';
import { OrderDetail } from '../entities/orderDetail.entity';
import { ProductClassification } from '../entities/productClassification.entity';
import { accountRepository } from '../repositories/account.repository';
import { brandRepository } from '../repositories/brand.repository';
import { OrderEnum, ShippingStatusEnum } from '../utils/enum';
import { validate as isUUID } from 'uuid';
import { addressRepository } from '../repositories/address.repository';

const repository = AppDataSource.getRepository(Order);
class OrderService extends BaseService<Order> {
  async getMyOrders(
    search: string,
    status: ShippingStatusEnum,
    loginUser: string
  ) {
    const commonConditions = {
      relations: {
        account: true,
        orderDetails: {
          productClassification: { product: { brand: true } },
          productClassificationPreOrder: { product: { brand: true } },
        },
        voucher: true,
      },
      where: {
        account: { id: loginUser },
        parent: Not(IsNull()),
      },
      order: {
        createdAt: { direction: 'DESC' as const },
      },
    };
    // if status is not empty, get my orders by status
    if (status) {
      return await repository.find({
        ...commonConditions,
        where: {
          ...commonConditions.where,
          status: status,
        },
      });
    }
    // if searh is null or empty, get all my order
    if (!search) {
      return await repository.find({
        ...commonConditions,
      });
    }
    // if search is uuid , search by id
    if (isUUID(search)) {
      return await repository.find({
        ...commonConditions,
        where: {
          ...commonConditions.where,
          id: search,
        },
      });
    }
    // else, get my orders by product name, brand name
    const searchConditions = [
      // Tìm theo product name
      {
        ...commonConditions.where,
        orderDetails: {
          productClassification: {
            product: { name: ILike(`%${search}%`) },
          },
        },
      },
      // Tìm theo productClassificationPreOrder product name
      {
        ...commonConditions.where,
        orderDetails: {
          productClassificationPreOrder: {
            product: { name: ILike(`%${search}%`) },
          },
        },
      },
      // Tìm theo brand name
      {
        ...commonConditions.where,
        orderDetails: {
          productClassification: {
            product: { brand: { name: ILike(`%${search}%`) } },
          },
        },
      },
      // Tìm theo brand name
      {
        ...commonConditions.where,
        orderDetails: {
          productClassificationPreOrder: {
            product: { brand: { name: ILike(`%${search}%`) } },
          },
        },
      },
    ];
    return await repository.find({
      ...commonConditions,
      where: searchConditions,
    });
  }
  async getByBrand(brandId: string) {
    const brand = await brandRepository.findOne({
      where: { id: brandId },
    });
    if (!brand) throw new BadRequestError('Brand not found');

    const orders = await repository.find({
      relations: {
        account: true,
        orderDetails: {
          productClassification: { product: true },
          productClassificationPreOrder: { product: true },
        },
        voucher: true,
      },
      where: [
        {
          parent: Not(IsNull()),
          orderDetails: {
            productClassification: {
              product: {
                brand: { id: brandId },
              },
            },
          },
        },
        {
          parent: Not(IsNull()),
          orderDetails: {
            productClassificationPreOrder: {
              product: {
                brand: { id: brandId },
              },
            },
          },
        },
      ],
      order: {
        createdAt: 'DESC',
      },
    });
    return orders;
  }

  async getAllTotalOrders() {
    const orders = await repository.find({
      relations: {
        account: true,
        children: {
          orderDetails: {
            productClassification: { product: { brand: true } },
            productClassificationPreOrder: { product: { brand: true } },
          },
          voucher: true,
        },
      },
      where: {
        parent: IsNull(),
      },
      order: {
        createdAt: 'DESC',
      },
    });
    return orders;
  }

  async createPreOrder(preOrderBody: PreOrderRequest, accountId: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const account = await accountRepository.findOne({
        where: { id: accountId },
      });
      let platformVoucher: Voucher = null;
      //init parent order
      const parentOrder: Order = new Order();
      Object.assign(parentOrder, preOrderBody);
      parentOrder.children = [];
      parentOrder.account = account;
      //define type pre order
      parentOrder.type = OrderEnum.PRE_ORDER;

      //validate platform voucher
      if (preOrderBody.platformVoucherId) {
        platformVoucher = await voucherRepository.findOne({
          where: { id: preOrderBody.platformVoucherId },
          relations: { brand: true },
        });
        await voucherService.validatePlatformVoucher(
          preOrderBody.platformVoucherId,
          accountId
        );
        parentOrder.voucher = platformVoucher;
      }
      //validate shop voucher
      if (preOrderBody.shopVoucherId) {
        await voucherService.validateShopVoucher(
          preOrderBody.shopVoucherId,
          accountId
        );
      }
      //create shop order
      const childOrder: Order = new Order();
      Object.assign(childOrder, preOrderBody);
      childOrder.orderDetails = [];
      childOrder.account = account;

      let shopVoucher: Voucher = null;
      if (preOrderBody.shopVoucherId) {
        shopVoucher = await voucherRepository.findOne({
          where: { id: preOrderBody.shopVoucherId },
          relations: ['brand'],
        });
        childOrder.voucher = shopVoucher;
      }
      //find product
      const productClassification =
        await productClassificationRepository.findOne({
          where: { id: preOrderBody.productClassificationId },
          relations: { preOrderProduct: { product: true } },
        });
      if (!productClassification)
        throw new BadRequestError('Product not found');
      if (preOrderBody.quantity > productClassification.quantity) {
        throw new BadRequestError('Product is out of stock');
      }
      if (!productClassification.preOrderProduct)
        throw new BadRequestError('Product is not pre-order product');
      if (productClassification.preOrderProduct.status != 'ACTIVE') {
        throw new BadRequestError('Product is not active');
      }
      let price = productClassification.price;
      //create order detail
      const orderDetail = new OrderDetail();
      orderDetail.subTotal = price;
      orderDetail.quantity = preOrderBody.quantity;
      orderDetail.totalPrice = price;
      orderDetail.productClassification = productClassification;
      //update quantity of product classification
      productClassification.quantity -= preOrderBody.quantity;
      await queryRunner.manager.save(
        ProductClassification,
        productClassification
      );
      //push order detail into child order
      childOrder.orderDetails.push(orderDetail);
      if (shopVoucher) {
        voucherService.applyShopVoucher(childOrder);
        childOrder.voucher = shopVoucher;
      }
      //push child order into parent order
      parentOrder.children.push(childOrder);
      if (platformVoucher) {
        voucherService.applyPlatformVoucher(parentOrder);
        parentOrder.voucher = platformVoucher;
      }

      voucherService.calculateOrderPrice(parentOrder);

      await queryRunner.manager.save(Order, parentOrder);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  async createNormal(orderNormalBody: OrderNormalRequest, accountId: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const account = await accountRepository.findOne({
        where: { id: accountId },
      });
      const address = await addressRepository.findOne({
        where: { id: orderNormalBody.addressId },
      });
      if (!address) throw new BadRequestError(`Address not found`);
      const now = new Date();
      let platformVoucher: Voucher = null;
      //init parent order
      const parentOrder: Order = new Order();
      Object.assign(parentOrder, orderNormalBody);

      parentOrder.shippingAddress = address.fullAddress;
      parentOrder.phone = address.phone;
      parentOrder.notes = address.notes;

      parentOrder.children = [];
      parentOrder.account = account;

      //validate platform voucher
      if (orderNormalBody.platformVoucherId) {
        platformVoucher = await voucherRepository.findOne({
          where: { id: orderNormalBody.platformVoucherId },
          relations: { brand: true },
        });
        await voucherService.validatePlatformVoucher(
          orderNormalBody.platformVoucherId,
          accountId
        );
        parentOrder.voucher = platformVoucher;
      }
      //validate shop vouchers
      for (const order of orderNormalBody.orders) {
        if (order.shopVoucherId) {
          await voucherService.validateShopVoucher(
            order.shopVoucherId,
            accountId
          );
        }
      }
      for (const order of orderNormalBody.orders) {
        //create shop order
        const childOrder: Order = new Order();
        Object.assign(childOrder, orderNormalBody);
        
        childOrder.shippingAddress = address.fullAddress;
        childOrder.phone = address.phone;
        childOrder.notes = address.notes;

        childOrder.message = order.message;
        childOrder.orderDetails = [];
        childOrder.account = account;

        let shopVoucher: Voucher = null;
        if (order.shopVoucherId) {
          shopVoucher = await voucherRepository.findOne({
            where: { id: order.shopVoucherId },
            relations: ['brand'],
          });
          childOrder.voucher = shopVoucher;
        }
        for (const item of order.items) {
          //find product
          const productClassification =
            await productClassificationRepository.findOne({
              where: { id: item.productClassificationId },
              relations: { product: true },
            });
          if (!productClassification)
            throw new BadRequestError('Product not found');
          if (item.quantity > productClassification.quantity) {
            throw new BadRequestError('Product is out of stock');
          }
          let price = productClassification.price;
          //create order detail
          const orderDetail = new OrderDetail();
          orderDetail.type = OrderEnum.NORMAL;
          //check product discount event
          const productDiscountEvent = await productDiscountRepository.findOne({
            where: {
              product: { id: productClassification.product.id }, // Lọc theo productId
              startTime: LessThanOrEqual(now.toISOString()), // startTime <= now
              endTime: MoreThanOrEqual(now.toISOString()), // endTime >= now
            },
          });
          if (productDiscountEvent) {
            const productClassificationFlashSale =
              await productClassificationRepository.findOne({
                where: {
                  productDiscount: { id: productDiscountEvent.id },
                },
                relations: { productDiscount: true },
              });
            if (
              productClassificationFlashSale &&
              productClassificationFlashSale.quantity >= item.quantity
            ) {
              price = productClassificationFlashSale.price;
              orderDetail.productDiscount = productDiscountEvent;
              orderDetail.type = OrderEnum.FLASH_SALE;
            }
          }
          orderDetail.subTotal = price;
          orderDetail.quantity = item.quantity;
          orderDetail.totalPrice = price;
          orderDetail.productClassification = productClassification;
          //update quantity of product classification
          productClassification.quantity -= item.quantity;
          await queryRunner.manager.save(
            ProductClassification,
            productClassification
          );
          //push order detail into child order
          childOrder.orderDetails.push(orderDetail);
        }
        if (shopVoucher) {
          voucherService.applyShopVoucher(childOrder);
          childOrder.voucher = shopVoucher;
        }
        //push child order into parent order
        parentOrder.children.push(childOrder);
      }
      if (platformVoucher) {
        voucherService.applyPlatformVoucher(parentOrder);
        parentOrder.voucher = platformVoucher;
      }

      voucherService.calculateOrderPrice(parentOrder);

      await queryRunner.manager.save(Order, parentOrder);
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
}

export const orderService = new OrderService();
