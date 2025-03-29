import { statusTrackingRepository } from './../repositories/statusTracking.repository';
import {
  ILike,
  In,
  IsNull,
  Not,
  QueryRunner,
  SelectQueryBuilder,
} from 'typeorm';
import { AppDataSource } from '../dataSource';
import { BadRequestError } from '../errors/error';
import { BaseService } from './base.service';
import { Order } from '../entities/order.entity';
import {
  RequestRefundRequest,
  PreOrderRequest,
  UpdateOrderStatusRequest,
  OrderNormalRequest,
  MakeDicisionRefundRequest,
  MakeDicisionRejectRefundRequest,
  ComplaintRequestRequest,
  MakeDicisionComplaintRequest as MakeDicisionComplaintRequest,
  SearchOrderRequest,
  GetMyRequestsRequest,
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
  RequestStatusEnum,
  OrderEnum,
  PaymentMethodEnum,
  ShippingStatusEnum,
  VoucherVisibilityEnum,
  VoucherWalletStatus,
  OrderRequestTypeEnum,
  ActionReceivedEnum,
  TransactionTypeEnum,
} from '../utils/enum';
import { validate as isUUID } from 'uuid';
import { addressRepository } from '../repositories/address.repository';
import { orderRepository } from '../repositories/order.repository';
import { cartRepository } from '../repositories/cart.repository';
import { VoucherWallet } from '../entities/voucherWallet.entity';
import { nextShippingStatusMap } from '../utils/nextStatusMap';
import { StatusTracking } from '../entities/statusTracking.entity';
import { Account } from '../entities/account.entity';
import { voucherWalletRepository } from '../repositories/voucherWallet.reposirory';
import { walletRepository } from '../repositories/wallet.reposirory';
import { Wallet } from '../entities/wallet.entity';
import { Transaction } from '../entities/transaction.entity';
import { transactionService } from './transaction.service';
import { walletService } from './wallet.service';
import { MediaFile } from '../entities/mediaFile.entity';
import { retrieveMasterConfig } from '../utils/retrieveMasterConfig';
import { addNormalOrderToQueue } from '../utils/queue/cancelOrderQueue';
import { addRefundRequestToQueue } from '../utils/queue/approveRefundRequestQueue';
import { orderRequestRepository } from '../repositories/orderRequest.repository';
import { OrderRequest } from '../entities/orderRequest.entity';
import { File } from '../entities/file.entity';
import { addUpdateRefundedStatusOrderToQueue } from '../utils/queue/updateRefundedStatusOrderQueue';
import { addUpdateBrandReceiveStatusOrderToQueue } from '../utils/queue/updateBrandReceiveStatusOrderQueue';

const repository = AppDataSource.getRepository(Order);
class OrderService extends BaseService<Order> {
  async getMyRequests(
    loginUser: string,
    getMyRequestsRequest: GetMyRequestsRequest
  ) {
    const { types, statusList } = getMyRequestsRequest;
    const queryBuilder = orderRequestRepository
      .createQueryBuilder('orderRequest')
      .leftJoinAndSelect('orderRequest.order', 'order')
      .leftJoinAndSelect('orderRequest.mediaFiles', 'mediaFiles')
      .leftJoinAndSelect(
        'orderRequest.rejectedRefundRequest',
        'rejectedRefundRequest'
      )
      .leftJoinAndSelect(
        'rejectedRefundRequest.mediaFiles',
        'rejectedRefundRequestMediaFiles'
      )
      .where('order.account.id = :loginUser', { loginUser })
      .orderBy('orderRequest.createdAt', 'DESC');
    this.queryBuilderForOrder(queryBuilder);
    if (types && types.length > 0) {
      queryBuilder.andWhere('orderRequest.type IN (:...types)', { types });
    }
    if (statusList && statusList.length > 0) {
      queryBuilder.andWhere('orderRequest.status IN (:...statusList)', {
        statusList,
      });
    }
    const requests = await queryBuilder.getMany();
    return requests;
  }

  async takeReceivedAction(action: ActionReceivedEnum, orderId: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let isReceived = false;
      const order = await orderRepository.findOne({
        where: {
          id: orderId,
        },
        relations: {
          account: true,
        },
      });
      if (!order) throw new BadRequestError('Order not found');
      if (order.status != ShippingStatusEnum.RETURNING)
        throw new BadRequestError(
          `Can not take action on this order due to current status ${order.status}`
        );
      if (action == ActionReceivedEnum.RECEIVED) {
        await Promise.all([
          //update order status
          (async () => {
            order.status = ShippingStatusEnum.BRAND_RECEIVED;
            await queryRunner.manager.save(Order, order);
          })(),
          //create status tracking
          orderService.createStatusTracking(
            order,
            order.account.id,
            ShippingStatusEnum.BRAND_RECEIVED,
            'Auto update',
            queryRunner
          ),
        ]);
        isReceived = true;
      } else {
        const masterConfig = await retrieveMasterConfig();
        order.expiredReceivedTime = new Date(
          Date.now() + Number(masterConfig.expiredReceivedTime)
        );
        await queryRunner.manager.save(Order, order);
        await addUpdateBrandReceiveStatusOrderToQueue(order);
        isReceived = false;
      }
      await queryRunner.commitTransaction();
      return isReceived;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getRequestsOfOrder(orderId: string) {
    const order = await orderRepository.findOne({
      where: {
        id: orderId,
      },
      relations: {
        requests: {
          mediaFiles: true,
          rejectedRefundRequest: {
            mediaFiles: true,
          },
        },
      },
    });
    if (!order) throw new BadRequestError('Order not found');
    const cancelRequest = order.requests.find(
      (request) => request.type == OrderRequestTypeEnum.CANCEL
    );
    const refundRequest = order.requests.find(
      (request) => request.type == OrderRequestTypeEnum.REFUND
    );
    const complaintRequest = order.requests.find(
      (request) => request.type == OrderRequestTypeEnum.COMPLAINT
    );
    return {
      cancelRequest,
      refundRequest,
      complaintRequest,
    };
  }

  async makeDecisionOnComplaintRequest(
    requestId: string,
    makeDicisionComplaintRequest: MakeDicisionComplaintRequest
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { reasonRejected, status } = makeDicisionComplaintRequest;
      let isApproved = false;
      const complaintRequest = await orderRequestRepository.findOne({
        where: {
          id: requestId,
          type: OrderRequestTypeEnum.COMPLAINT,
        },
        relations: {
          order: {
            account: true,
            brand: true,
            voucher: true,
          },
        },
      });
      if (!complaintRequest) throw new BadRequestError('Request not found');
      const order = complaintRequest.order;
      if (status === RequestStatusEnum.REJECTED) {
        if (!reasonRejected)
          throw new BadRequestError('Reason Rejected required when rejected');
        complaintRequest.status = status;
        complaintRequest.reasonRejected =
          makeDicisionComplaintRequest.reasonRejected;

        await queryRunner.manager.save(OrderRequest, complaintRequest);

        await Promise.all([
          //update order status
          (async () => {
            order.status = ShippingStatusEnum.REFUNDED;
            await queryRunner.manager.save(Order, order);
          })(),
          //create status tracking
          this.createStatusTracking(
            order,
            order.account.id,
            ShippingStatusEnum.REFUNDED,
            null,
            queryRunner
          ),
          //refund to wallet
          (async () => {
            const wallet = await walletRepository.findOne({
              where: {
                owner: { id: order.account.id },
              },
            });
            wallet.balance += order.totalPrice;
            await queryRunner.manager.save(wallet);
          })(),
        ]);

        //create transaction
        const transaction =
          await transactionService.createTransactionFromChildOrder(
            complaintRequest.order,
            TransactionTypeEnum.ORDER_REFUND
          );
        await queryRunner.manager.save(Transaction, transaction);

        //refund voucher for type gr buying
        if (order.type == OrderEnum.GROUP_BUYING) {
          const voucher = order.voucher;
          const voucherWallet = new VoucherWallet();
          voucherWallet.owner = order.account;
          voucherWallet.voucher = voucher;
          await queryRunner.manager.save(VoucherWallet, voucherWallet);
        }

        isApproved = false;
      } else if (status === RequestStatusEnum.APPROVED) {
        complaintRequest.status = status;
        await queryRunner.manager.save(OrderRequest, complaintRequest);

        await Promise.all([
          //update order status
          (async () => {
            order.status = ShippingStatusEnum.RETURNED_FAIL;
            await queryRunner.manager.save(Order, order);
          })(),
          //create status tracking
          this.createStatusTracking(
            order,
            order.account.id,
            ShippingStatusEnum.RETURNED_FAIL,
            null,
            queryRunner
          ),
        ]);

        isApproved = true;
      }
      await queryRunner.commitTransaction();
      return isApproved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  async requestComplaint(
    complainRequestRequest: ComplaintRequestRequest,
    orderId: string
  ) {
    const order = await orderRepository.findOne({
      where: { id: orderId },
    });
    if (!order) throw new BadRequestError(`Order not found`);
    if (
      ![
        ShippingStatusEnum.BRAND_RECEIVED,
        ShippingStatusEnum.RETURNING,
      ].includes(order.status)
    )
      throw new BadRequestError(
        `Can not request complaint due to current status ${order.status}`
      );
    const masterConfig = await retrieveMasterConfig();
    const brandReceivedStatusTracking = await statusTrackingRepository.findOne({
      where: {
        status: ShippingStatusEnum.BRAND_RECEIVED,
      },
    });
    if (
      brandReceivedStatusTracking &&
      brandReceivedStatusTracking.createdAt.getTime() +
        masterConfig.complaintTimeExpired <
        Date.now()
    )
      throw new BadRequestError('Complaint time expired');
    const complainRequest = await orderRequestRepository.findOne({
      where: {
        order: { id: orderId },
        type: OrderRequestTypeEnum.COMPLAINT,
      },
    });
    if (complainRequest)
      throw new BadRequestError(
        'Only request complaint once. Can not request anymore'
      );
    const createdComplaintRequest = new OrderRequest();
    createdComplaintRequest.type = OrderRequestTypeEnum.COMPLAINT;
    createdComplaintRequest.order = order;
    createdComplaintRequest.reason = complainRequestRequest.reason;
    createdComplaintRequest.mediaFiles = complainRequestRequest.mediaFiles.map(
      (file) => {
        const fileEntity = new File();
        fileEntity.fileUrl = file;
        return fileEntity;
      }
    );
    const createdComplaintRequestEntity = await orderRequestRepository.save(
      createdComplaintRequest
    );
    return createdComplaintRequestEntity;
  }
  async makeDecisionOnRejectRefundRequest(
    requestId: string,
    makeDicisionRejectRefundRequest: MakeDicisionRejectRefundRequest
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { reasonRejected, status } = makeDicisionRejectRefundRequest;
      let isApproved = false;
      const rejectRefundRequest = await orderRequestRepository.findOne({
        where: {
          id: requestId,
          type: OrderRequestTypeEnum.REJECT_REFUND,
        },
        relations: {
          refundRequest: {
            order: true,
          },
        },
      });
      if (!rejectRefundRequest) throw new BadRequestError('Request not found');
      if (status === RequestStatusEnum.REJECTED) {
        if (!reasonRejected)
          throw new BadRequestError('Reason Rejected required when rejected');
        rejectRefundRequest.status = status;
        rejectRefundRequest.reasonRejected =
          makeDicisionRejectRefundRequest.reasonRejected;
        await queryRunner.manager.save(OrderRequest, rejectRefundRequest);
        isApproved = false;
      } else if (status === RequestStatusEnum.APPROVED) {
        const order = rejectRefundRequest.refundRequest.order;

        rejectRefundRequest.status = status;
        await queryRunner.manager.save(OrderRequest, rejectRefundRequest);

        if (order.status != ShippingStatusEnum.COMPLETED) {
          await Promise.all([
            //update order status
            (async () => {
              order.status = ShippingStatusEnum.COMPLETED;
              await queryRunner.manager.save(Order, order);
            })(),
            //create status tracking
            this.createStatusTracking(
              order,
              order.account.id,
              ShippingStatusEnum.COMPLETED,
              null,
              queryRunner
            ),
          ]);
        }

        isApproved = true;
      }
      await queryRunner.commitTransaction();
      return isApproved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  // async getBothRequestRefundCancel(orderId: string) {
  //   const order = await orderRepository.findOne({
  //     where: {
  //       id: orderId,
  //     },
  //     relations: {
  //       cancelOrderRequest: true,
  //       refundRequest: {
  //         mediaFiles: true,
  //         rejectRefundRequest: {
  //           mediaFiles: true,
  //         },
  //       },
  //       complaintRequest: {
  //         mediaFiles: true,
  //       },
  //     },
  //   });
  //   if (!order) throw new BadRequestError(`Order not found`);
  //   return {
  //     cancelOrderRequest: order.cancelOrderRequest,
  //     refundRequest: order.refundRequest,
  //   };
  // }
  async makeDecisionOnRefundRequest(
    requestId: string,
    makeDicisionRefundRequest: MakeDicisionRefundRequest
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const { reasonRejected, status, mediaFiles } = makeDicisionRefundRequest;
      let isApproved = false;
      const refundRequest = await orderRequestRepository.findOne({
        where: {
          id: requestId,
          type: OrderRequestTypeEnum.REFUND,
        },
        relations: {
          order: { account: true },
        },
      });
      if (!refundRequest) throw new BadRequestError('Request not found');
      if (status === RequestStatusEnum.REJECTED) {
        if (!reasonRejected)
          throw new BadRequestError('Reason Rejected required when rejected');
        refundRequest.status = status;
        await queryRunner.manager.save(OrderRequest, refundRequest);

        //create reject refund request
        const rejectRefundRequest = new OrderRequest();
        rejectRefundRequest.type = OrderRequestTypeEnum.REJECT_REFUND;
        rejectRefundRequest.refundRequest = refundRequest;
        rejectRefundRequest.reason = reasonRejected;
        if (mediaFiles && mediaFiles.length > 0) {
          rejectRefundRequest.mediaFiles = mediaFiles.map((file) => {
            const fileEntity = new File();
            fileEntity.fileUrl = file;
            return fileEntity;
          });
        }
        await queryRunner.manager.save(OrderRequest, rejectRefundRequest);

        isApproved = false;
      } else if (status === RequestStatusEnum.APPROVED) {
        const order = refundRequest.order;
        await Promise.all([
          //update refund request status
          (async () => {
            refundRequest.status = status;
            await queryRunner.manager.save(OrderRequest, refundRequest);
          })(),
          //update order status
          // (async () => {
          //   order.status = ShippingStatusEnum.RETURNING;
          //   await queryRunner.manager.save(Order, order);
          // })(),
          //create status tracking
          // this.createStatusTracking(
          //   order,
          //   order.account.id,
          //   ShippingStatusEnum.RETURNING,
          //   refundRequest.reason,
          //   queryRunner
          // ),
        ]);
        isApproved = true;
      }
      await queryRunner.commitTransaction();
      return isApproved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  async requestRefund(
    requestRefundRequest: RequestRefundRequest,
    orderId: string,
    loginUser: string
  ) {
    const order = await orderRepository.findOne({
      where: { id: orderId },
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
    });
    if (!order) throw new BadRequestError(`Order not found`);
    if (order.account.id != loginUser)
      throw new BadRequestError('You are not owner of this order');
    if (
      ![ShippingStatusEnum.DELIVERED, ShippingStatusEnum.COMPLETED].includes(
        order.status
      )
    )
      throw new BadRequestError(
        `Can not request refund due to current status ${order.status}`
      );
    const masterConfig = await retrieveMasterConfig();
    const deliveredStatusTracking = await statusTrackingRepository.findOne({
      where: {
        status: ShippingStatusEnum.DELIVERED,
      },
    });
    if (
      deliveredStatusTracking.createdAt.getTime() +
        masterConfig.refundTimeExpired <
      Date.now()
    )
      throw new BadRequestError('Refund time expired');
    const refundRequest = await orderRequestRepository.findOne({
      where: {
        order: { id: orderId },
        type: OrderRequestTypeEnum.REFUND,
      },
    });
    if (refundRequest)
      throw new BadRequestError(
        'Only request refund once. Can not request anymore'
      );
    const createdRefundRequest = new OrderRequest();
    createdRefundRequest.type = OrderRequestTypeEnum.REFUND;
    createdRefundRequest.order = order;
    createdRefundRequest.reason = requestRefundRequest.reason;
    createdRefundRequest.mediaFiles = requestRefundRequest.mediaFiles.map(
      (file) => {
        const fileEntity = new File();
        fileEntity.fileUrl = file;
        return fileEntity;
      }
    );
    const createdRefundRequestEntity = await orderRequestRepository.save(
      createdRefundRequest
    );
    await addRefundRequestToQueue(createdRefundRequestEntity.id);
  }
  async getCancelRequestById(requestId: string) {
    const cancelRequest = await orderRequestRepository.findOne({
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
  async getMyCancelRequests(status: RequestStatusEnum, userId: string) {
    if (!status)
      return await orderRequestRepository.find({
        relations: {
          order: true,
        },
        where: {
          order: {
            account: { id: userId },
          },
          type: OrderRequestTypeEnum.CANCEL,
        },
        order: {
          updatedAt: 'DESC',
        },
      });
    return await orderRequestRepository.find({
      relations: {
        order: true,
      },
      where: {
        order: {
          account: { id: userId },
        },
        type: OrderRequestTypeEnum.CANCEL,
        status,
      },
      order: {
        updatedAt: 'DESC',
      },
    });
  }

  queryBuilderForOrder(queryBuilder: SelectQueryBuilder<any>) {
    queryBuilder
      .leftJoinAndSelect('order.orderDetails', 'orderDetail')
      .leftJoinAndSelect(
        'orderDetail.productClassification',
        'productClassification'
      )
      .leftJoinAndSelect(
        'productClassification.images',
        'productClassificationImages'
      )
      .leftJoinAndSelect('productClassification.product', 'product')
      .leftJoinAndSelect('product.brand', 'productBrand')
      .leftJoinAndSelect('product.images', 'productImages')
      .leftJoinAndSelect(
        'productClassification.productDiscount',
        'productDiscount'
      )
      .leftJoinAndSelect('productDiscount.product', 'discountProduct')
      .leftJoinAndSelect('discountProduct.brand', 'discountProductBrand')
      .leftJoinAndSelect('discountProduct.images', 'discountProductImages')
      .leftJoinAndSelect(
        'productClassification.preOrderProduct',
        'preOrderProduct'
      )
      .leftJoinAndSelect('preOrderProduct.product', 'preOrderProductItem')
      .leftJoinAndSelect('preOrderProductItem.brand', 'preOrderProductBrand')
      .leftJoinAndSelect('preOrderProductItem.images', 'preOrderProductImages');
  }

  async getCancelRequestOfBrand(brandId: string, status: RequestStatusEnum) {
    const brand = await brandRepository.findOne({
      where: { id: brandId },
    });
    if (!brand) throw new BadRequestError('Brand not found');

    const queryBuilder = orderRequestRepository
      .createQueryBuilder('cancelRequest')
      .innerJoinAndSelect('cancelRequest.order', 'order')
      .innerJoinAndSelect('order.orderDetails', 'orderDetails')
      .innerJoinAndSelect(
        'orderDetails.productClassification',
        'productClassification'
      )
      .leftJoinAndSelect('productClassification.product', 'product')
      .leftJoinAndSelect('productClassification.images', 'images')
      .leftJoinAndSelect(
        'productClassification.productDiscount',
        'productDiscount'
      )
      .leftJoinAndSelect('productDiscount.product', 'discountProduct')
      .leftJoinAndSelect(
        'productClassification.preOrderProduct',
        'preOrderProduct'
      )
      .leftJoinAndSelect('preOrderProduct.product', 'preProduct')
      .where('cancelRequest.type = :type', {
        type: OrderRequestTypeEnum.CANCEL,
      })
      .andWhere(
        '(product.brand_id = :brandId OR discountProduct.brand_id = :brandId OR preProduct.brand_id = :brandId)',
        { brandId }
      )
      .orderBy('cancelRequest.updatedAt', 'DESC');

    if (status) {
      queryBuilder.andWhere('cancelRequest.status = :status', { status });
    }
    const cancelRequests = await queryBuilder.getMany();
    return cancelRequests;
  }

  async makeDecisionOnRequest(
    requestId: string,
    status: RequestStatusEnum,
    reasonRejected: string
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let isApproved = false;
      const cancelOrderRequest = await orderRequestRepository.findOne({
        where: {
          id: requestId,
          type: OrderRequestTypeEnum.CANCEL,
        },
        relations: {
          order: true,
        },
      });
      if (!cancelOrderRequest) throw new BadRequestError('Request not found');
      if (status === RequestStatusEnum.REJECTED) {
        if (!reasonRejected)
          throw new BadRequestError('Reason Rejected required when rejected');
        cancelOrderRequest.status = status;
        cancelOrderRequest.reasonRejected = reasonRejected;
        await queryRunner.manager.save(OrderRequest, cancelOrderRequest);
        isApproved = false;
      } else if (status === RequestStatusEnum.APPROVED) {
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
          //update status of transaction
          transactionService.cancelTransactionBasedOnOrderId(
            order.id,
            queryRunner
          ),
          //update status of request
          (async () => {
            cancelOrderRequest.status = RequestStatusEnum.APPROVED;
            await queryRunner.manager.save(OrderRequest, cancelOrderRequest);
          })(),
          //refund voucher
          this.refundVoucherInBothChildAndParentOrder(order, queryRunner),
          //refund to wallet
          walletService.refundFromCancelOrder(order, queryRunner),
          //return back stock quantity
          this.returnBackStockQuantity(order, queryRunner),
          //create status tracking
          this.createStatusTracking(
            order,
            order.account.id,
            status,
            cancelOrderRequest.reason,
            queryRunner
          ),
        ]);
        isApproved = true;
      }
      await queryRunner.commitTransaction();
      return isApproved;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async returnBackStockQuantity(order: Order, queryRunner: QueryRunner) {
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
        account: true,
        orderDetails: {
          feedback: {
            mediaFiles: true,
            replies: {
              account: { role: true },
            },
          },
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
    updateOrderStatusRequest: UpdateOrderStatusRequest,
    orderId: string,
    userId: string
  ) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const status = updateOrderStatusRequest.status;
      const order = await orderRepository.findOne({
        where: { id: orderId },
        relations: {
          account: true,
        },
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
      if (
        status == ShippingStatusEnum.BRAND_RECEIVED &&
        order.status != ShippingStatusEnum.RETURNING
      )
        throw new BadRequestError(
          `Brand only receive order when current status is RETURNING`
        );
      if (
        status == ShippingStatusEnum.RETURNING &&
        [ShippingStatusEnum.COMPLETED, ShippingStatusEnum.DELIVERED].includes(
          order.status
        )
      ) {
      } else if (nextShippingStatusMap[order.status] != status)
        throw new BadRequestError('Can not update this status');
      //update transaction if order status is WAIT_FOR_CONFIRMATION and payment method is not Cash
      // if (
      //   status == ShippingStatusEnum.WAIT_FOR_CONFIRMATION &&
      //   order.paymentMethod != PaymentMethodEnum.CASH
      // ) {
      //   const transaction =
      //     await transactionService.createTransactionFromChildOrder(order, TransactionTypeEnum.ORDER_PURCHASE);
      //   await queryRunner.manager.save(Transaction, transaction);
      // }
      await Promise.all([
        //update order status and save
        (async () => {
          order.status = status;
          await queryRunner.manager.save(Order, order);
        })(),
        //create status tracking
        this.createStatusTracking(
          order,
          userId,
          status,
          null,
          queryRunner,
          updateOrderStatusRequest.mediaFiles
        ),
      ]);
      if (status == ShippingStatusEnum.BRAND_RECEIVED) {
        await addUpdateRefundedStatusOrderToQueue(orderId);
      } else if (status == ShippingStatusEnum.RETURNING) {
        const masterConfig = await retrieveMasterConfig();
        order.expiredReceivedTime = new Date(
          Date.now() + Number(masterConfig.expiredReceivedTime)
        );
        await queryRunner.manager.save(Order, order);
        await addUpdateBrandReceiveStatusOrderToQueue(order);
      } else if (status == ShippingStatusEnum.REFUNDED) {
        const wallet = await walletRepository.findOne({
          where: {
            owner: { id: order.account.id },
          },
        });
        if (!wallet) throw new BadRequestError(`Wallet not found`);
        wallet.balance += order.totalPrice;
        await queryRunner.manager.save(wallet);

        const transaction =
          await transactionService.createTransactionFromChildOrder(
            order,
            TransactionTypeEnum.ORDER_REFUND
          );
        await queryRunner.manager.save(Transaction, transaction);
      }
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
          ShippingStatusEnum.SHIPPING,
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
          //update status of transaction
          transactionService.cancelTransactionBasedOnOrderId(
            order.id,
            queryRunner
          ),
          //refund to wallet
          walletService.refundFromCancelOrder(order, queryRunner),
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

  async createStatusTracking(
    order: Order,
    userId: string,
    status: string,
    reason: string,
    queryRunner: QueryRunner,
    mediaFiles?: string[]
  ) {
    let statusTracking = new StatusTracking();
    statusTracking.order = order;
    if (userId) {
      statusTracking.updatedBy = new Account();
      statusTracking.updatedBy.id = userId;
    }
    statusTracking.status = status;
    statusTracking.reason = reason;
    if (mediaFiles && mediaFiles.length > 0) {
      //create media files
      const mediaFileObjects = mediaFiles.map((file) => {
        const mediaFile = new MediaFile();
        mediaFile.fileUrl = file;
        return mediaFile;
      });
      statusTracking.mediaFiles = mediaFileObjects;
    }
    await queryRunner.manager.save(StatusTracking, statusTracking);
  }

  async customerCancelOrder(orderId: string, reason: string, userId: string) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      let cancelStatus = 0;
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
      const cancelOrderRequest = await orderRequestRepository.findOne({
        where: {
          order: {
            id: order.id,
          },
          type: OrderRequestTypeEnum.CANCEL,
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
          //update status of transaction
          transactionService.cancelTransactionBasedOnOrderId(
            order.id,
            queryRunner
          ),
          //refund to wallet
          walletService.refundFromCancelOrder(order, queryRunner),
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
        cancelStatus = 1;
      } else if (order.status == ShippingStatusEnum.PREPARING_ORDER) {
        const cancelOrderRequest = new OrderRequest();
        cancelOrderRequest.type = OrderRequestTypeEnum.CANCEL;
        cancelOrderRequest.reason = reason;
        cancelOrderRequest.order = order;
        await queryRunner.manager.save(OrderRequest, cancelOrderRequest);
        cancelStatus = 0;
      } else
        throw new BadRequestError(
          `Can not request cancel due to current status ${order.status}`
        );
      await queryRunner.commitTransaction();
      return cancelStatus;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelChildOrder(order: Order, queryRunner: QueryRunner) {
    await Promise.all([
      //update order status and save
      (async () => {
        order.status = ShippingStatusEnum.CANCELLED;
        await queryRunner.manager.save(Order, order);
      })(),
      //refund voucher
      this.refundVoucher(order, queryRunner),
      //return back stock quantity
      this.returnBackStockQuantity(order, queryRunner),
      //create status tracking
      this.createStatusTracking(
        order,
        null,
        ShippingStatusEnum.CANCELLED,
        'AUTO CANCELLED',
        queryRunner
      ),
    ]);
  }

  async cancelParentOrder(order: Order, queryRunner: QueryRunner) {
    //cancel child orders
    for (const childOrder of order.children) {
      await this.cancelChildOrder(childOrder, queryRunner);
    }
    //cancel parent order
    await Promise.all([
      //update order status and save
      (async () => {
        order.status = ShippingStatusEnum.CANCELLED;
        await queryRunner.manager.save(Order, order);
      })(),
      //refund voucher
      this.refundVoucher(order, queryRunner),
      //create status tracking
      this.createStatusTracking(
        order,
        null,
        ShippingStatusEnum.CANCELLED,
        'AUTO CANCELLED',
        queryRunner
      ),
    ]);
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
        updatedBy: { role: true },
        order: true,
        mediaFiles: true,
      },
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async getMyOrders(searchOrderRequest: SearchOrderRequest, loginUser: string) {
    const { search, statusList } = searchOrderRequest;
    const commonConditions = {
      relations: {
        account: true,
        orderDetails: {
          feedback: {
            replies: {
              account: true,
            },
          },
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
    if (statusList && statusList.length > 0) {
      return await repository.find({
        ...commonConditions,
        where: {
          ...commonConditions.where,
          status: In(statusList),
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
          feedback: true,
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
        childOrder.recipientName = address.fullName;

        childOrder.message = order.message;
        childOrder.orderDetails = [];
        childOrder.account = account;
        const brand = await brandRepository.findOne({
          where: { id: order.brandId },
        });
        if (!brand) throw new BadRequestError(`Brand not found`);
        childOrder.brand = brand;

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
      if (createdParentOrder.status == ShippingStatusEnum.TO_PAY) {
        await addNormalOrderToQueue(createdParentOrder.id);
      }
      await queryRunner.manager.save(StatusTracking, statusTrackings);

      //remove cart items after order has been created
      const productClassificationIds = orderNormalBody.orders.flatMap((order) =>
        order.items.map((item) => item.productClassificationId)
      );
      await this.removeItemsFromCartAfterOrder(
        productClassificationIds,
        accountId
      );

      // //create pending transaction
      // const transactions = createdParentOrder.children.map((childOrder) => {
      //   return transactionService.createTransactionFromChildOrder(childOrder);
      // });
      // await queryRunner.manager.save(Transaction, transactions);

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

        const transactions = [];
        // Create transactions for child orders
        for (const childOrder of parentOrder.children) {
          const transaction =
            await transactionService.createTransactionFromChildOrder(
              childOrder,
              TransactionTypeEnum.ORDER_PURCHASE
            );
          transactions.push(transaction);
        }
        await queryRunner.manager.save(Transaction, transactions);

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

  async updateDecreaseStockQuantity(
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
