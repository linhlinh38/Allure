import { productClassificationRepository } from './../repositories/productClassification.repository';
import { In, IsNull, Not, QueryRunner } from 'typeorm';
import { AppDataSource } from '../dataSource';
import { BadRequestError } from '../errors/error';
import { BaseService } from './base.service';
import { groupBuyingRepository } from '../repositories/groupBuying.repository';
import { OrderEnum, ShippingStatusEnum, StatusEnum } from '../utils/enum';
import { GroupBuyingJoinEventRequest } from '../dtos/request/groupBuying.request';
import { GroupBuying } from '../entities/groupBuying.entity';
import { accountRepository } from '../repositories/account.repository';
import { Order } from '../entities/order.entity';
import { addressRepository } from '../repositories/address.repository';
import { OrderDetail } from '../entities/orderDetail.entity';
import { voucherService } from './voucher.service';
import { StatusTracking } from '../entities/statusTracking.entity';
import { orderRepository } from '../repositories/order.repository';
import { walletRepository } from '../repositories/wallet.reposirory';
import { orderService } from './order.service';

const repository = AppDataSource.getRepository(GroupBuying);
class GroupBuyingService extends BaseService<GroupBuying> {
  async getByBrand(brandId: string, status: StatusEnum) {
    if (!status)
      return await repository.find({
        where: {
          groupProduct: { products: { brand: { id: brandId } } },
        },
        relations: {
          groupProduct: {
            criterias: { voucher: true },
            products: {
              images: true,
              productClassifications: { images: true },
            },
          },
          criteria: { voucher: true },
          creator: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    return await repository.find({
      where: {
        status,
        groupProduct: { products: { brand: { id: brandId } } },
      },
      relations: {
        groupProduct: {
          criterias: { voucher: true },
          products: {
            images: true,
            productClassifications: { images: true },
          },
        },
        criteria: { voucher: true },
        creator: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
  async getAll() {
    return await repository.find({
      relations: {
        groupProduct: {
          criterias: { voucher: true },
          products: {
            images: true,
            productClassifications: { images: true },
          },
        },
        criteria: { voucher: true },
        creator: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async getByStatus(status: StatusEnum) {
    if (!status)
      return await repository.find({
        relations: {
          groupProduct: {
            criterias: { voucher: true },
            products: {
              images: true,
              productClassifications: { images: true },
            },
          },
          criteria: { voucher: true },
          creator: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    return await repository.find({
      where: {
        status,
      },
      relations: {
        groupProduct: {
          criterias: { voucher: true },
          products: {
            images: true,
            productClassifications: { images: true },
          },
        },
        criteria: { voucher: true },
        creator: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }
  async getMyGroupBuyings(loginUser: string, status: StatusEnum) {
    if (!status)
      return await repository.find({
        where: {
          creator: { id: loginUser },
        },
        relations: {
          groupProduct: {
            criterias: { voucher: true },
            products: {
              images: true,
              productClassifications: { images: true },
            },
          },
          criteria: { voucher: true },
          creator: true,
        },
        order: {
          createdAt: 'DESC',
        },
      });
    return await repository.find({
      where: {
        creator: { id: loginUser },
        status,
      },
      relations: {
        groupProduct: {
          criterias: { voucher: true },
          products: {
            images: true,
            productClassifications: { images: true },
          },
        },
        criteria: { voucher: true },
        creator: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

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
      parentOrder.recipientName = address.fullName;

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
      childOrder.recipientName = address.fullName;
      childOrder.status = ShippingStatusEnum.JOIN_GROUP_BUYING;
      parentOrder.children = [childOrder];
      childOrder.groupBuying = groupBuying;

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
        orderDetail.classificationName = productClassification.title;
        orderDetail.productName = productClassification.product?.name;
        orderDetail.type = OrderEnum.GROUP_BUYING;
        orderDetail.subTotal =
          item.quantity * orderDetail.unitPriceAfterDiscount;
        orderDetail.totalPrice = orderDetail.subTotal;
        orderDetail.quantity = item.quantity;
        orderDetail.productClassification = productClassification;
        //update quantity of product classification
        productClassification.quantity -= item.quantity;
        // await queryRunner.manager.save(
        //   ProductClassification,
        //   productClassification
        // );

        //push order detail into child order
        childOrder.orderDetails.push(orderDetail);
      }

      //create status trackings for parent and child order
      const statusTrackings = orderService.updateOrderStatusBeforeCreation(
        parentOrder,
        ShippingStatusEnum.JOIN_GROUP_BUYING
      );
      await queryRunner.manager.save(StatusTracking, statusTrackings);
      await orderService.updateDecreaseStockQuantity(parentOrder, queryRunner);
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

  async endGroupBuying(groupBuyingId: string) {
    let isEventEndSuccess = false;
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const groupBuying = await repository.findOne({
        where: { id: groupBuyingId },
        relations: {
          criteria: { voucher: true },
          groupProduct: {
            criterias: { voucher: true },
          },
        },
      });
      if (!groupBuying) throw new BadRequestError('Group buying not found');
      if (groupBuying.status != StatusEnum.ACTIVE)
        throw new BadRequestError('Only end active group buying');
      groupBuying.status = StatusEnum.INACTIVE;
      const orders = await orderRepository.find({
        where: { groupBuying: { id: groupBuyingId }, parent: Not(IsNull()) },
        relations: {
          parent: true,
          orderDetails: {
            productClassification: { product: true, images: true },
          },
        },
      });
      if (orders.length < groupBuying.criteria.threshold) {
        await this.cancelAllOrdersInGroupbuying(orders, queryRunner);
        isEventEndSuccess = false;
      } else {
        //key: orderId, value: can afford or not (boolean)
        const orderIdCanAffordMap = {};
        let countAffordableOrder = 0;

        for (const order of orders) {
          const wallet = await walletRepository.findOne({
            where: {
              owner: { id: order.account.id },
            },
          });
          //apply voucher
          order.voucher = groupBuying.criteria.voucher;
          voucherService.applyShopVoucher(order);
          voucherService.calculateOrderPrice(order.parent);

          if (wallet && wallet.balance >= order.totalPrice) {
            countAffordableOrder++;
            orderIdCanAffordMap[order.id] = true;
          } else {
            orderIdCanAffordMap[order.id] = false;
          }
        }
        if (countAffordableOrder < groupBuying.criteria.threshold) {
          await this.cancelAllOrdersInGroupbuying(orders, queryRunner);
          isEventEndSuccess = false;
        } else {
          //find most matching criteria
          const criterias = groupBuying.groupProduct.criterias.sort(
            (a, b) => b.threshold - a.threshold
          );
          const findCriteria = criterias.find(
            (criteria) => criteria.threshold <= countAffordableOrder
          );

          for (const order of orders) {
            const wallet = await walletRepository.findOne({
              where: {
                owner: { id: order.account.id },
              },
            });
            //apply voucher
            order.voucher = findCriteria.voucher;
            voucherService.applyShopVoucher(order);
            voucherService.calculateOrderPrice(order.parent);
            //check if order is affordable or not
            if (orderIdCanAffordMap[order.id]) {
              wallet.balance -= order.totalPrice;
              await queryRunner.manager.save(wallet);
              //change order status
              const statusTrackings =
                orderService.updateOrderStatusBeforeCreation(
                  order.parent,
                  ShippingStatusEnum.WAIT_FOR_CONFIRMATION
                );
              await queryRunner.manager.save(StatusTracking, statusTrackings);
              await queryRunner.manager.save(Order, [order, order.parent]);
            } else {
              await this.cancelOneOrderInGroupbuying(order, queryRunner);
            }
          }
          isEventEndSuccess = true;
        }
      }
      await queryRunner.manager.save(groupBuying);
      await queryRunner.commitTransaction();
      return isEventEndSuccess;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async cancelOneOrderInGroupbuying(
    order: Order,
    queryRunner: QueryRunner
  ) {
    //update status
    const statusTrackings = orderService.updateOrderStatusBeforeCreation(
      order.parent,
      ShippingStatusEnum.CANCELLED
    );
    await queryRunner.manager.save(StatusTracking, statusTrackings);
    await queryRunner.manager.save(Order, [order, order.parent]);
    await orderService.returnBackStockQuantity(order, queryRunner);
  }

  private async cancelAllOrdersInGroupbuying(
    orders: Order[],
    queryRunner: QueryRunner
  ) {
    for (const order of orders) {
      this.cancelOneOrderInGroupbuying(order, queryRunner);
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
