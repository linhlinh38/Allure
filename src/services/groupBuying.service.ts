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
import { ProductClassification } from '../entities/productClassification.entity';
import { masterConfigRepository } from '../repositories/masterConfig.repository';
import { criteriaRepository } from '../repositories/criteria.repository';
import { Transaction } from '../entities/transaction.entity';
import { transactionService } from './transaction.service';
import { addGroupBuyingToQueue } from '../utils/queue/endGrBuyingQueue';
import Logging from '../utils/Logging';
import { retrieveMasterConfig } from '../utils/retrieveMasterConfig';

const repository = AppDataSource.getRepository(GroupBuying);
class GroupBuyingService extends BaseService<GroupBuying> {
  async startToEnd(groupBuyingId: string, loginUser: string) {
    const groupBuying = await groupBuyingRepository.findOne({
      where: {
        id: groupBuyingId,
      },
      relations: {
        creator: true,
        orders: true,
        groupProduct: true,
      },
    });
    if (!groupBuying) throw new BadRequestError('GroupBuying not found');
    if (loginUser != groupBuying.creator.id)
      throw new BadRequestError('Only creator can start to end group buying');
    if (groupBuying.endTime < new Date())
      throw new BadRequestError('Group buying has ended');
    const masterConfig = await retrieveMasterConfig();
    //nhỏ hơn groupBuyingRemainingTime
    if (
      groupBuying.endTime.getTime() - Date.now() <
      masterConfig.groupBuyingRemainingTime
    )
      throw new BadRequestError(
        'Can not start to end because there is under 15 minutes left'
      );
    const criterias = await criteriaRepository.find({
      where: {
        groupProduct: { id: groupBuying.groupProduct.id },
      },
      order: {
        threshold: 'ASC',
      },
    });
    if (groupBuying.orders.length < criterias[0].threshold)
      throw new BadRequestError('Not enough orders to end group buying');
    groupBuying.endTime = new Date(
      Date.now() + masterConfig.groupBuyingRemainingTime
    );
    await groupBuying.save();
    await addGroupBuyingToQueue(
      groupBuyingId,
      masterConfig.groupBuyingRemainingTime
    );
  }
  async getOrderByGroupBuyingId(groupBuyingId: string, loginUser: string) {
    const groupBuying = await groupBuyingRepository.findOne({
      where: {
        id: groupBuyingId,
      },
    });
    if (!groupBuying) throw new BadRequestError('GroupBuying not found');
    const order = await orderRepository.findOne({
      where: {
        groupBuying: { id: groupBuyingId },
        account: { id: loginUser },
        parent: Not(IsNull()),
      },
      relations: {
        orderDetails: {
          productClassification: { product: true, images: true },
        },
        voucher: true,
      },
    });
    return order;
  }
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
        creator: true,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }

  async updateOrder(
    groupBuyingJoinEventBody: GroupBuyingJoinEventRequest,
    childOrderId: string
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const childOrderWithParentRelation = await orderRepository.findOne({
        where: {
          id: childOrderId,
        },
        relations: {
          parent: true,
        },
      });
      const parentOrder = await orderRepository.findOne({
        where: {
          id: childOrderWithParentRelation.parent.id,
          parent: IsNull(),
        },
        relations: {
          children: {
            orderDetails: {
              productClassification: { product: true, images: true },
            },
            voucher: true,
          },
          groupBuying: { groupProduct: { products: true } },
        },
      });
      const groupBuying = parentOrder.groupBuying;
      if (groupBuying.endTime < new Date())
        throw new BadRequestError('Group buying has ended');
      if (parentOrder.status != ShippingStatusEnum.JOIN_GROUP_BUYING)
        throw new BadRequestError('Order status is not valid');
      const childOrder = parentOrder.children[0];
      const oldProductClassfications = childOrder.orderDetails.map(
        (orderDetail) => {
          const productClassification = orderDetail.productClassification;
          productClassification.quantity += orderDetail.quantity;
          return productClassification;
        }
      );
      await this.removeAllOrderDetails(childOrder, queryRunner);
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
      const address = await addressRepository.findOne({
        where: { id: groupBuyingJoinEventBody.addressId },
      });
      if (!address) throw new BadRequestError(`Address not found`);
      console.log('hehe 10');
      //update parent order
      parentOrder.shippingAddress = address.fullAddress;
      parentOrder.phone = address.phone;
      parentOrder.notes = address.notes;
      parentOrder.recipientName = address.fullName;

      //update child order
      childOrder.shippingAddress = address.fullAddress;
      childOrder.phone = address.phone;
      childOrder.notes = address.notes;
      childOrder.recipientName = address.fullName;

      childOrder.orderDetails = [];

      for (const item of groupBuyingJoinEventBody.items) {
        //find product
        const productClassification =
          await productClassificationRepository.findOne({
            where: { id: item.productClassificationId },
            relations: {
              product: true,
            },
          });
        if (!productClassification)
          throw new BadRequestError('Product not found');
        if (item.quantity > productClassification.quantity) {
          throw new BadRequestError('Product is out of stock');
        }
        //find old product classification
        const findOldProductClassification = oldProductClassfications.find(
          (classification) => classification.id == productClassification.id
        );
        if (findOldProductClassification)
          productClassification.quantity =
            findOldProductClassification.quantity;
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
        console.log(orderDetail);

        //push order detail into child order
        childOrder.orderDetails.push(orderDetail);
      }
      // update quantity of product classifications
      await queryRunner.manager.save(
        ProductClassification,
        childOrder.orderDetails.map(
          (orderDetail) => orderDetail.productClassification
        )
      );
      voucherService.calculateOrderPrice(parentOrder);
      await queryRunner.manager.save(parentOrder);

      await queryRunner.commitTransaction();
      return parentOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async removeAllOrderDetails(order: Order, queryRunner: QueryRunner) {
    await queryRunner.manager.remove(OrderDetail, order.orderDetails);
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
      if (groupBuying.status != StatusEnum.ACTIVE)
        throw new BadRequestError(`Group buying is not active`);

      const order = await orderRepository.findOne({
        where: {
          groupBuying: { id: groupBuyingId },
          account: { id: userId },
          parent: Not(IsNull()),
        },
      });
      if (order)
        throw new BadRequestError(`Only order once in each groupBuying`);

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

      const smallestCriteria = (
        await criteriaRepository.find({
          where: {
            groupProduct: { id: groupBuying.groupProduct.id },
          },
          relations: {
            voucher: true,
          },
          order: {
            threshold: 'ASC',
          },
        })
      )[0];
      childOrder.voucher = smallestCriteria.voucher;
      voucherService.applyShopVoucher(childOrder);
      voucherService.calculateOrderPrice(parentOrder);
      const wallet = await walletRepository.findOne({
        where: {
          owner: { id: userId },
        },
      });
      if (!wallet || parentOrder.totalPrice > wallet.balance)
        throw new BadRequestError(`Wallet balance is not enough`);

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
          groupProduct: {
            brand: true,
            criterias: { voucher: true },
          },
        },
      });
      let criteriasDescThreshold = await criteriaRepository.find({
        where: {
          groupProduct: { id: groupBuying.groupProduct.id },
        },
        relations: {
          voucher: true,
        },
        order: {
          threshold: 'ASC',
        },
      });
      if (!groupBuying) throw new BadRequestError('Group buying not found');
      if (groupBuying.status != StatusEnum.ACTIVE)
        throw new BadRequestError('Only end active group buying');
      groupBuying.status = StatusEnum.INACTIVE;
      const orders = await orderRepository.find({
        where: { groupBuying: { id: groupBuyingId }, parent: Not(IsNull()) },
        relations: {
          parent: {
            account: true,
            children: true,
          },
          orderDetails: {
            productClassification: { product: true, images: true },
          },
        },
      });
      if (orders.length < criteriasDescThreshold[0].threshold) {
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
          order.voucher = criteriasDescThreshold[0].voucher;
          voucherService.applyShopVoucher(order);
          voucherService.calculateOrderPrice(order.parent);

          if (wallet && wallet.balance >= order.totalPrice) {
            countAffordableOrder++;
            orderIdCanAffordMap[order.id] = true;
          } else {
            orderIdCanAffordMap[order.id] = false;
          }
        }
        if (countAffordableOrder < criteriasDescThreshold[0].threshold) {
          await this.cancelAllOrdersInGroupbuying(orders, queryRunner);
          isEventEndSuccess = false;
        } else {
          //find most matching criteria
          criteriasDescThreshold = criteriasDescThreshold.sort(
            (a, b) => b.threshold - a.threshold
          );
          const mostMatchingCriteria = criteriasDescThreshold.find(
            (criteria) => criteria.threshold <= countAffordableOrder
          );

          for (const order of orders) {
            const wallet = await walletRepository.findOne({
              where: {
                owner: { id: order.account.id },
              },
            });
            //apply voucher
            order.voucher = mostMatchingCriteria.voucher;
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
              //create transaction
              const transaction =
                transactionService.createTransactionFromOrderGroupBuying(
                  order,
                  groupBuying
                );
              await queryRunner.manager.save(Transaction, transaction);
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
    await queryRunner.manager.save(Order, order.parent);
    await orderService.returnBackStockQuantity(order, queryRunner);
  }

  private async cancelAllOrdersInGroupbuying(
    orders: Order[],
    queryRunner: QueryRunner
  ) {
    for (const order of orders) {
      await this.cancelOneOrderInGroupbuying(order, queryRunner);
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
