import { productClassificationRepository } from './../repositories/productClassification.repository';
import { In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { AppDataSource } from '../dataSource';
import {
  GroupProductCreateRequest,
  GroupProductUpdateRequest,
} from '../dtos/request/groupProduct.request';
import { BadRequestError } from '../errors/error';
import { BaseService } from './base.service';
import { groupBuyingRepository } from '../repositories/groupBuying.repository';
import {
  OrderEnum,
  ShippingStatusEnum,
  StatusEnum,
  VoucherVisibilityEnum,
} from '../utils/enum';
import {
  GroupBuyingJoinEventRequest,
  GroupBuyingRequest,
} from '../dtos/request/groupBuying.request';
import { GroupBuying } from '../entities/groupBuying.entity';
import { accountRepository } from '../repositories/account.repository';
import { Order } from '../entities/order.entity';
import { addressRepository } from '../repositories/address.repository';
import { OrderDetail } from '../entities/orderDetail.entity';
import { ProductClassification } from '../entities/productClassification.entity';
import { voucherService } from './voucher.service';
import { group } from 'console';

const repository = AppDataSource.getRepository(GroupBuying);
class GroupBuyingService extends BaseService<GroupBuying> {
  async buy(
    groupBuyingJoinEventBody: GroupBuyingJoinEventRequest,
    groupBuyingId: string,
    userId: string
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const groupBuying = await groupBuyingRepository.findOne({
        where: { id: groupBuyingId },
        relations: {
          groupProduct: { products: true },
        },
      });
      if (!groupBuying) {
        throw new BadRequestError(`Group buying not found`);
      }
      const totalQuantity = groupBuyingJoinEventBody.items.reduce(
        (total, item) => total + item.quantity,
        0
      );
      if (
        groupBuying.groupProduct?.maxBuyAmountEachPerson &&
        totalQuantity > groupBuying.groupProduct.maxBuyAmountEachPerson
      )
        throw new BadRequestError(
          'Total quantity exceeds the maximum allowed per person'
        );
      const productClassifications = await productClassificationRepository.find(
        {
          where: {
            id: In(
              groupBuyingJoinEventBody.items.flatMap(
                (item) => item.productClassificationId
              )
            ),
          },
          relations: {
            product: true,
          },
        }
      );
      const allowProductIds = groupBuying.groupProduct.products.map(
        (product) => product.id
      );
      for (const productClassification of productClassifications) {
        if (!allowProductIds.includes(productClassification.product?.id)) {
          throw new BadRequestError(
            'Product chosen is not available in this group'
          );
        }
      }
      const account = await accountRepository.findOne({
        where: { id: userId },
      });
      const address = await addressRepository.findOne({
        where: { id: groupBuyingJoinEventBody.addressId },
      });
      if (!address) throw new BadRequestError(`Address not found`);
      //init parent order
      const parentOrder: Order = new Order();

      parentOrder.shippingAddress = address.fullAddress;
      parentOrder.phone = address.phone;
      parentOrder.notes = address.notes;

      parentOrder.account = account;
      parentOrder.status = ShippingStatusEnum.JOIN_GROUP_BUYING;
      parentOrder.groupBuying = groupBuying;

      //create child order
      const childOrder: Order = new Order();

      childOrder.shippingAddress = address.fullAddress;
      childOrder.phone = address.phone;
      childOrder.notes = address.notes;

      childOrder.orderDetails = [];
      childOrder.account = account;
      childOrder.status = ShippingStatusEnum.JOIN_GROUP_BUYING;
      parentOrder.children = [childOrder];
      parentOrder.groupBuying = groupBuying;

      for (const item of groupBuyingJoinEventBody.items) {
        //find product
        const productClassification =
          await productClassificationRepository.findOne({
            where: { id: item.productClassificationId },
            relations: {
              product: true,
              productDiscount: true,
              preOrderProduct: true,
            },
          });
        if (!productClassification)
          throw new BadRequestError('Product not found');
        if (item.quantity > productClassification.quantity) {
          throw new BadRequestError('Product is out of stock');
        }
        //create order detail
        const orderDetail = new OrderDetail();
        orderDetail.unitPriceBeforeDiscount = productClassification.price;
        orderDetail.unitPriceAfterDiscount = productClassification.price;
        orderDetail.type = OrderEnum.GROUP_BUYING;
        // //check product discount event
        // if (productClassification.productDiscount) {
        //   orderDetail.unitPriceAfterDiscount =
        //     productClassification.price *
        //     (1 - productClassification.productDiscount.discount);
        //   orderDetail.type = OrderEnum.FLASH_SALE;
        //   orderDetail.productDiscount = productClassification.productDiscount;
        // } else if (productClassification.preOrderProduct) {
        //   orderDetail.type = OrderEnum.PRE_ORDER;
        // }
        orderDetail.subTotal =
          item.quantity * orderDetail.unitPriceAfterDiscount;
        orderDetail.totalPrice = orderDetail.subTotal;
        orderDetail.quantity = item.quantity;
        orderDetail.productClassification = productClassification;
        //update quantity of product classification
        productClassification.quantity -= item.quantity;
        await queryRunner.manager.save(
          ProductClassification,
          productClassification
        );
        //push order detail into child order
        parentOrder.orderDetails.push(orderDetail);
      }
      voucherService.calculateOrderPrice(parentOrder);

      const createdParentOrder = await queryRunner.manager.save(
        Order,
        parentOrder
      );
      await queryRunner.commitTransaction();
      return createdParentOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  async getById(groupBuyingId: string) {
    const groupBuying = await repository.findOne({
      where: { id: groupBuyingId },
      relations: {
        groupProduct: {
          criterias: { voucher: true },
          products: { images: true, productClassifications: { images: true } },
        },
        criteria: { voucher: true },
        creator: true,
      },
    });
    if (!groupBuying) throw new BadRequestError('Group buying not found');
    return groupBuying;
  }

  constructor() {
    super(repository);
  }
}
export const groupBuyingService = new GroupBuyingService();
