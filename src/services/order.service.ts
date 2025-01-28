import { ILike, In, IsNull, Not, QueryRunner } from 'typeorm';
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
import { Voucher } from '../entities/voucher.entity';
import { voucherService } from './voucher.service';
import { OrderDetail } from '../entities/orderDetail.entity';
import { ProductClassification } from '../entities/productClassification.entity';
import { accountRepository } from '../repositories/account.repository';
import { brandRepository } from '../repositories/brand.repository';
import {
  CancelOrderRequestStatusEnum,
  OrderEnum,
  PaymentMethodEnum,
  ShippingStatusEnum,
  VoucherVisibilityEnum,
  VoucherWalletStatus,
} from '../utils/enum';
import { validate as isUUID } from 'uuid';
import { addressRepository } from '../repositories/address.repository';
import { orderRepository } from '../repositories/order.repository';
import { cartRepository } from '../repositories/cart.repository';
import { VoucherWallet } from '../entities/voucherWallet.entity';
import nextShippingStatusMap from '../utils/util';
import { StatusTracking } from '../entities/statusTracking.entity';
import { Account } from '../entities/account.entity';
import { statusTrackingRepository } from '../repositories/statusTracking.repository';
import { voucherWalletRepository } from '../repositories/voucherWallet.reposirory';
import { CancelOrderRequest } from '../entities/cancelOrderRequest.entity';
import { cancelOrderRequestRepository } from '../repositories/cancelOrderRequest.repository';
import { walletRepository } from '../repositories/wallet.reposirory';
import { Wallet } from '../entities/wallet.entity';

const repository = AppDataSource.getRepository(Order);
class OrderService extends BaseService<Order> {
  async getCancelRequestById(requestId: string) {
    const cancelRequest = await cancelOrderRequestRepository.findOne({
      where: {
        id: requestId,
      },
      relations: {
        order: true,
      },
    });
    if (!cancelRequest) throw new BadRequestError('Request not found');
    return cancelRequest;
  }
  async getMyCancelRequests(
    status: CancelOrderRequestStatusEnum,
    userId: string
  ) {
    if (!status)
      return await cancelOrderRequestRepository.find({
        relations: {
          order: true,
        },
        where: {
          order: {
            account: { id: userId },
          },
        },
        order: {
          updatedAt: 'DESC',
        },
      });
    return await cancelOrderRequestRepository.find({
      relations: {
        order: true,
      },
      where: {
        order: {
          account: { id: userId },
        },
        status,
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }
  async getCancelRequestOfBrand(
    brandId: string,
    status: CancelOrderRequestStatusEnum
  ) {
    const brand = await brandRepository.findOne({
      where: {
        id: brandId,
      },
    });
    if (!brand) throw new BadRequestError('Brand not found');
    const commonConditions = [
      {
        order: {
          orderDetails: {
            productClassification: {
              product: { brand: { id: brandId } },
            },
          },
        },
      },
      {
        order: {
          orderDetails: {
            productClassification: {
              productDiscount: { product: { brand: { id: brandId } } },
            },
          },
        },
      },
      {
        order: {
          orderDetails: {
            productClassification: {
              preOrderProduct: { product: { brand: { id: brandId } } },
            },
          },
        },
      },
    ];
    if (!status)
      return await cancelOrderRequestRepository.find({
        where: commonConditions,
        relations: {
          order: true,
        },
        order: {
          updatedAt: 'DESC',
        },
      });
    commonConditions.forEach((cond) => {
      cond['status'] = status;
    });
    return await cancelOrderRequestRepository.find({
      where: commonConditions,
      relations: {
        order: true,
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  async makeDecisionOnRequest(
    requestId: string,
    status: CancelOrderRequestStatusEnum
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const cancelOrderRequest = await cancelOrderRequestRepository.findOne({
        where: {
          id: requestId,
        },
        relations: {
          order: true,
        },
      });
      if (!cancelOrderRequest) throw new BadRequestError('Request not found');
      if (status === CancelOrderRequestStatusEnum.REJECTED) {
        cancelOrderRequest.status = status;
        await queryRunner.manager.save(CancelOrderRequest, cancelOrderRequest);
      } else if (status === CancelOrderRequestStatusEnum.APPROVED) {
        const order = await orderRepository.findOne({
          where: { id: cancelOrderRequest.order.id },
          relations: {
            voucher: true,
            orderDetails: { productClassification: true },
            parent: {
              children: {
                voucher: true,
              },
              voucher: true,
            },
            account: true,
          },
        });
        await Promise.all([
          //update order status and save
          (async () => {
            order.status = ShippingStatusEnum.CANCELLED;
            await queryRunner.manager.save(Order, order);
          })(),
          //update status of request
          (async () => {
            cancelOrderRequest.status = CancelOrderRequestStatusEnum.APPROVED;
            await queryRunner.manager.save(
              CancelOrderRequest,
              cancelOrderRequest
            );
          })(),
          //refund voucher
          this.refundVoucherInBothChildAndParentOrder(order, queryRunner),
          //return back stock quantity
          this.returnBackStockQuantity(order, queryRunner),
          //create status tracking
          this.createStatusTracking(
            order,
            order.account.id,
            status,
            null,
            queryRunner
          ),
        ]);
        await queryRunner.commitTransaction();
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async returnBackStockQuantity(
    order: Order,
    queryRunner: QueryRunner
  ) {
    const productClassifications = order.orderDetails.map((orderDetail) => {
      const productClassification = orderDetail.productClassification;
      if (productClassification) {
        productClassification.quantity += orderDetail.quantity;
        return productClassification;
      }
    });
    await queryRunner.manager.save(
      ProductClassification,
      productClassifications
    );
  }

  private async refundVoucherInBothChildAndParentOrder(
    order: Order,
    queryRunner: QueryRunner
  ) {
    const isAllOrdersCancelled =
      order.parent.children.filter(
        (childOrder) =>
          childOrder.id != order.id &&
          childOrder.status == ShippingStatusEnum.CANCELLED
      ).length == 0;
    if (isAllOrdersCancelled)
      await Promise.all([
        this.refundVoucher(order.parent, queryRunner),
        this.refundVoucher(order, queryRunner),
      ]);
    else await this.refundVoucher(order, queryRunner);
  }

  async getById(orderId: string) {
    const order = await orderRepository.findOne({
      where: { id: orderId },
      relations: {
        orderDetails: {
          productClassification: {
            images: true,
            product: { brand: true, images: true },
            productDiscount: { product: { brand: true, images: true } },
            preOrderProduct: { product: { brand: true, images: true } },
          },
        },
        voucher: true,
      },
    });
    if (!order) throw new BadRequestError(`Order not found`);
    return order;
  }
  async updateStatus(
    status: ShippingStatusEnum,
    orderId: string,
    userId: string
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await orderRepository.findOne({
        where: { id: orderId },
      });
      if (!order) {
        throw new BadRequestError(`Order not found`);
      }
      if (
        status == ShippingStatusEnum.CANCELLED &&
        ![
          ShippingStatusEnum.WAIT_FOR_CONFIRMATION,
          ShippingStatusEnum.TO_PAY,
          ShippingStatusEnum.PREPARING_ORDER,
        ].includes(order.status)
      )
        throw new BadRequestError(
          `Can not cancel order due to current status ${order.status}`
        );
      if (nextShippingStatusMap[order.status] != status)
        throw new BadRequestError('Can not update this status');
      await Promise.all([
        //update order status and save
        (async () => {
          order.status = status;
          await queryRunner.manager.save(Order, order);
        })(),
        //create status tracking
        this.createStatusTracking(order, userId, status, null, queryRunner),
      ]);
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async brandCancelOrder(orderId: string, reason: any, userId: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await orderRepository.findOne({
        where: { id: orderId },
        relations: {
          voucher: true,
          parent: {
            children: {
              voucher: true,
            },
            voucher: true,
          },
          account: true,
          orderDetails: { productClassification: true },
        },
      });
      if (!order) {
        throw new BadRequestError(`Order not found`);
      }
      if (
        [
          ShippingStatusEnum.WAIT_FOR_CONFIRMATION,
          ShippingStatusEnum.TO_PAY,
          ShippingStatusEnum.PREPARING_ORDER,
        ].includes(order.status)
      ) {
        await Promise.all([
          //update order status and save
          (async () => {
            order.status = ShippingStatusEnum.CANCELLED;
            await queryRunner.manager.save(Order, order);
          })(),
          //refund voucher
          this.refundVoucherInBothChildAndParentOrder(order, queryRunner),
          //return back stock quantity
          this.returnBackStockQuantity(order, queryRunner),
          //create status tracking
          this.createStatusTracking(
            order,
            userId,
            ShippingStatusEnum.CANCELLED,
            reason,
            queryRunner
          ),
        ]);
        await queryRunner.commitTransaction();
        return;
      }
      throw new BadRequestError(
        `Can not cancel due to current status ${order.status}`
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async createStatusTracking(
    order: Order,
    userId: string,
    status: string,
    reason: any,
    queryRunner: QueryRunner
  ) {
    let statusTracking = new StatusTracking();
    statusTracking.order = order;
    statusTracking.updatedBy = new Account();
    statusTracking.updatedBy.id = userId;
    statusTracking.status = status;
    statusTracking.reason = reason;
    await queryRunner.manager.save(StatusTracking, statusTracking);
  }

  async customerCancelOrder(orderId: string, reason: string, userId: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const order = await orderRepository.findOne({
        where: { id: orderId },
        relations: {
          voucher: true,
          parent: {
            children: {
              voucher: true,
            },
            voucher: true,
          },
          account: true,
          orderDetails: { productClassification: true },
        },
      });
      if (!order) {
        throw new BadRequestError(`Order not found`);
      }
      const cancelOrderRequest = await cancelOrderRequestRepository.findOne({
        where: {
          order: {
            id: order.id,
          },
        },
      });
      if (cancelOrderRequest)
        throw new BadRequestError(
          'Only request cancel once. Can not request anymore'
        );
      if (
        [
          ShippingStatusEnum.WAIT_FOR_CONFIRMATION,
          ShippingStatusEnum.TO_PAY,
        ].includes(order.status)
      ) {
        await Promise.all([
          //update order status and save
          (async () => {
            order.status = ShippingStatusEnum.CANCELLED;
            await queryRunner.manager.save(Order, order);
          })(),
          //refund voucher
          this.refundVoucherInBothChildAndParentOrder(order, queryRunner),
          //return back stock quantity
          this.returnBackStockQuantity(order, queryRunner),
          //create status tracking
          this.createStatusTracking(
            order,
            userId,
            ShippingStatusEnum.CANCELLED,
            reason,
            queryRunner
          ),
        ]);
      } else if (order.status == ShippingStatusEnum.PREPARING_ORDER) {
        const cancelOrderRequest = new CancelOrderRequest();
        cancelOrderRequest.reason = reason;
        cancelOrderRequest.order = order;
        await queryRunner.manager.save(CancelOrderRequest, cancelOrderRequest);
      } else
        throw new BadRequestError(
          `Can not request cancel due to current status ${order.status}`
        );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async refundVoucher(order: Order, queryRunner: QueryRunner) {
    if (order.voucher) {
      const voucherWallet = await voucherWalletRepository.findOne({
        where: {
          voucher: { id: order.voucher.id },
          owner: { id: order.account.id },
        },
      });
      if (voucherWallet) {
        if (order.voucher.visibility == VoucherVisibilityEnum.PUBLIC) {
          await queryRunner.manager.remove(VoucherWallet, voucherWallet);
        } else if (order.voucher.visibility == VoucherVisibilityEnum.WALLET) {
          voucherWallet.status = VoucherWalletStatus.NOT_USED;
          await queryRunner.manager.save(VoucherWallet, voucherWallet);
        }
      }
    }
  }

  async getStatusTrackingOfOrder(orderId: string) {
    return await statusTrackingRepository.find({
      where: {
        order: {
          id: orderId,
        },
      },
      relations: {
        updatedBy: true,
        order: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async getMyOrders(
    search: string,
    status: ShippingStatusEnum,
    loginUser: string
  ) {
    const commonConditions = {
      relations: {
        account: true,
        orderDetails: {
          productClassification: {
            images: true,
            product: { brand: true, images: true },
            productDiscount: { product: { brand: true, images: true } },
            preOrderProduct: { product: { brand: true, images: true } },
          },
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
      {
        ...commonConditions.where,
        orderDetails: {
          productClassification: {
            productDiscount: { product: { name: ILike(`%${search}%`) } },
          },
        },
      },
      {
        ...commonConditions.where,
        orderDetails: {
          productClassification: {
            preOrderProduct: { product: { name: ILike(`%${search}%`) } },
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
      {
        ...commonConditions.where,
        orderDetails: {
          productClassification: {
            preOrderProduct: {
              product: { brand: { name: ILike(`%${search}%`) } },
            },
          },
        },
      },
      {
        ...commonConditions.where,
        orderDetails: {
          productDiscount: {
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
          productClassification: { product: true, images: true },
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
            productClassification: {
              images: true,
              product: { brand: true, images: true },
            },
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
        const createdPlatformVoucherWallet =
          await voucherService.validatePlatformVoucher(
            preOrderBody.platformVoucherId,
            accountId
          );
        await queryRunner.manager.save(
          VoucherWallet,
          createdPlatformVoucherWallet
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
      }
      //push child order into parent order
      parentOrder.children.push(childOrder);
      if (platformVoucher) {
        parentOrder.voucher = platformVoucher;
        voucherService.applyPlatformVoucher(parentOrder);
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
      let platformVoucher: Voucher = null;
      //init parent order
      const parentOrder: Order = new Order();
      Object.assign(parentOrder, orderNormalBody);

      parentOrder.shippingAddress = address.fullAddress;
      parentOrder.phone = address.phone;
      parentOrder.notes = address.notes;
      parentOrder.recipientName = address.fullName;

      parentOrder.children = [];
      parentOrder.account = account;

      //validate platform voucher
      if (orderNormalBody.platformVoucherId) {
        platformVoucher = await voucherRepository.findOne({
          where: { id: orderNormalBody.platformVoucherId },
          relations: {
            brand: true,
            applyProducts: true,
          },
        });
        const createdPlatformVoucherWallet =
          await voucherService.validatePlatformVoucher(
            orderNormalBody.platformVoucherId,
            accountId
          );
        await queryRunner.manager.save(
          VoucherWallet,
          createdPlatformVoucherWallet
        );
        parentOrder.voucher = platformVoucher;
      }
      //validate shop vouchers
      for (const order of orderNormalBody.orders) {
        if (order.shopVoucherId) {
          const createdShopVoucherWalletawait =
            await voucherService.validateShopVoucher(
              order.shopVoucherId,
              accountId
            );
          await queryRunner.manager.save(
            VoucherWallet,
            createdShopVoucherWalletawait
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
            relations: {
              brand: true,
              applyProducts: true,
            },
          });
          childOrder.voucher = shopVoucher;
        }
        for (const item of order.items) {
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
          //init order detail
          const orderDetail = this.initOrderDetail(productClassification, item);

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

      //check its payment method and corresponding logic for each method
      const statusTrackings =
        await this.updateStatusAndStockQuantityAccordingToPaymentMethod(
          parentOrder,
          accountId,
          queryRunner
        );

      const createdParentOrder = await queryRunner.manager.save(
        Order,
        parentOrder
      );

      await queryRunner.manager.save(statusTrackings);

      //remove cart items after order has been created
      const productClassificationIds = orderNormalBody.orders.flatMap((order) =>
        order.items.map((item) => item.productClassificationId)
      );
      await this.removeItemsFromCartAfterOrder(
        productClassificationIds,
        accountId
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

  private initOrderDetail(
    productClassification: ProductClassification,
    item: { productClassificationId: string; quantity: number }
  ) {
    const orderDetail = new OrderDetail();
    orderDetail.unitPriceBeforeDiscount = productClassification.price;
    orderDetail.unitPriceAfterDiscount = productClassification.price;
    orderDetail.classificationName = productClassification.title;
    orderDetail.productName =
      productClassification.product?.name ??
      productClassification.preOrderProduct?.product?.name ??
      productClassification.productDiscount?.product?.name;
    //check product discount event
    if (productClassification.productDiscount) {
      orderDetail.unitPriceAfterDiscount =
        productClassification.price *
        (1 - productClassification.productDiscount.discount);
      orderDetail.type = OrderEnum.FLASH_SALE;
      orderDetail.productDiscount = productClassification.productDiscount;
    } else if (productClassification.preOrderProduct) {
      orderDetail.type = OrderEnum.PRE_ORDER;
    } else orderDetail.type = OrderEnum.NORMAL;
    orderDetail.subTotal = item.quantity * orderDetail.unitPriceAfterDiscount;
    orderDetail.totalPrice = orderDetail.subTotal;
    orderDetail.quantity = item.quantity;
    orderDetail.productClassification = productClassification;
    return orderDetail;
  }

  private async createStatusTrackingForParentOrder(
    parentOrder: Order,
    status: ShippingStatusEnum,
    queryRunner: QueryRunner
  ) {
    //create status tracking for parent order
    let statusTracking = new StatusTracking();
    statusTracking.order = parentOrder;
    statusTracking.updatedBy = new Account();
    statusTracking.updatedBy.id = parentOrder.account.id;
    statusTracking.status = status;

    const statusTrackings = parentOrder.children.map((childOrder) => {
      //create status tracking for child order
      let statusTracking = new StatusTracking();
      statusTracking.order = childOrder;
      statusTracking.updatedBy = new Account();
      statusTracking.updatedBy.id = parentOrder.account.id;
      statusTracking.status = status;
      return statusTracking;
    });
    await queryRunner.manager.save(StatusTracking, [
      statusTracking,
      ...statusTrackings,
    ]);
  }

  private async updateStatusAndStockQuantityAccordingToPaymentMethod(
    parentOrder: Order,
    accountId: string,
    queryRunner: QueryRunner
  ) {
    //case 1: payment method = CASH
    if (parentOrder.paymentMethod == PaymentMethodEnum.CASH) {
      const statusTrackings = this.updateOrderStatusBeforeCreation(
        parentOrder,
        ShippingStatusEnum.WAIT_FOR_CONFIRMATION
      );
      await this.updateDecreaseStockQuantity(parentOrder, queryRunner);
      return statusTrackings;
    }
    //case 2: payment method = WALLET
    else if (parentOrder.paymentMethod == PaymentMethodEnum.WALLET) {
      //get wallet
      const wallet = await walletRepository.findOne({
        where: {
          owner: { id: accountId },
        },
      });
      //check balance if it is NOT enough
      if (!wallet || wallet.balance < parentOrder.totalPrice) {
        const statusTrackings = this.updateOrderStatusBeforeCreation(
          parentOrder,
          ShippingStatusEnum.TO_PAY
        );
        return statusTrackings;
      }
      //check balance if it is enough
      else {
        wallet.balance -= parentOrder.totalPrice;
        await queryRunner.manager.save(Wallet, wallet);
        const statusTrackings = this.updateOrderStatusBeforeCreation(
          parentOrder,
          ShippingStatusEnum.WAIT_FOR_CONFIRMATION
        );
        await this.updateDecreaseStockQuantity(parentOrder, queryRunner);
        return statusTrackings;
      }
    }
    //case 3: payment method = BANK_TRANSFER
    else if (parentOrder.paymentMethod == PaymentMethodEnum.BANK_TRANSFER) {
      const statusTrackings = this.updateOrderStatusBeforeCreation(
        parentOrder,
        ShippingStatusEnum.TO_PAY
      );
      return statusTrackings;
    }
  }

  private async updateDecreaseStockQuantity(
    parentOrder: Order,
    queryRunner: QueryRunner
  ) {
    for (const childOrder of parentOrder.children) {
      for (const orderDetail of childOrder.orderDetails) {
        const productClassification = orderDetail.productClassification;
        productClassification.quantity -= orderDetail.quantity;
        await queryRunner.manager.save(
          ProductClassification,
          productClassification
        );
      }
    }
  }

  updateOrderStatusBeforeCreation(
    parentOrder: Order,
    status: ShippingStatusEnum
  ) {
    //update status for parent order
    parentOrder.status = status;
    //create status tracking for parent order
    let statusTracking = new StatusTracking();
    statusTracking.order = parentOrder;
    statusTracking.updatedBy = new Account();
    statusTracking.updatedBy.id = parentOrder.account.id;
    statusTracking.status = status;

    const statusTrackings = parentOrder.children.map((childOrder) => {
      //update status for child order
      childOrder.status = status;
      //create status tracking for child order
      let statusTracking = new StatusTracking();
      statusTracking.order = childOrder;
      statusTracking.updatedBy = new Account();
      statusTracking.updatedBy.id = parentOrder.account.id;
      statusTracking.status = status;
      return statusTracking;
    });
    return [statusTracking, ...statusTrackings];
  }

  async removeItemsFromCartAfterOrder(
    productClassificationIds: string[],
    userId: string
  ) {
    const cartItems = await cartRepository.find({
      where: {
        productClassification: { id: In(productClassificationIds) },
        account: { id: userId },
      },
    });
    await cartRepository.remove(cartItems);
  }

  constructor() {
    super(repository);
  }
}

export const orderService = new OrderService();
