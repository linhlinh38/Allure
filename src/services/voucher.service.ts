import { In, IsNull, LessThanOrEqual, MoreThan, Not } from 'typeorm';
import { AppDataSource } from '../dataSource';

import { BaseService } from './base.service';

import { Voucher } from '../entities/voucher.entity';
import { voucherRepository } from '../repositories/voucher.repository';
import { plainToInstance } from 'class-transformer';
import { VoucherResponse } from '../dtos/response/voucher.response';
import { BadRequestError } from '../errors/error';
import { SearchDTO } from '../dtos/other/search.dto';
import {
  DiscountTypeEnum,
  VoucherApplyTypeEnum,
  ShippingStatusEnum,
  VoucherVisibilityEnum,
  VoucherWalletStatus,
  ClassificationTypeEnum,
} from '../utils/enum';
import { Order } from '../entities/order.entity';
import { orderRepository } from '../repositories/order.repository';
import {
  CheckoutItem,
  CheckoutItemRequest,
  GetBestPlatformVouchersRequest,
  GetBestShopVouchersRequest,
  VoucherRequest,
} from '../dtos/request/voucher.request';
import { brandRepository } from '../repositories/brand.repository';
import { productRepository } from '../repositories/product.repository';
import { voucherWalletRepository } from '../repositories/voucherWallet.reposirory';
import { VoucherWallet } from '../entities/voucherWallet.entity';
import { productClassificationRepository } from '../repositories/productClassification.repository';
import { ProductClassification } from '../entities/productClassification.entity';

class VoucherService extends BaseService<Voucher> {
  async categorizePlatformVouchersWhenCheckout(
    getBestPlatformVouchersRequest: GetBestPlatformVouchersRequest,
    loginUser: string
  ) {
    const checkoutItems = getBestPlatformVouchersRequest.checkoutItems;
    const classificationIds = checkoutItems.map(
      (item) => item.classificationId
    );
    const originalClassifications = await productClassificationRepository.find({
      where: { id: In(classificationIds) },
      relations: {
        product: { brand: true },
        productDiscount: { product: true },
        preOrderProduct: { product: true },
      },
    });
    // Tạo map từ classificationId sang quantity
    const quantityMap = new Map(
      checkoutItems.map((item) => [item.classificationId, item.quantity])
    );
    // Tính tổng amount
    const totalAmount = originalClassifications.reduce(
      (total, classification) => {
        const quantity = quantityMap.get(classification.id) || 0; // Lấy quantity tương ứng, mặc định là 0 nếu không có
        const price = classification.price || 0; // Đảm bảo price không bị null
        return total + price * quantity;
      },
      0
    );

    // logic to get unclaimedVouchers
    const walletVouchers = await voucherWalletRepository.find({
      where: {
        owner: { id: loginUser },
      },
      relations: {
        voucher: true,
      },
    });
    const claimedVoucherIds = walletVouchers.map((wallet) => wallet.voucher.id);
    const unclaimedVouchers = await voucherRepository.find({
      where: {
        id: Not(In(claimedVoucherIds)),
        visibility: VoucherVisibilityEnum.WALLET,
        endTime: MoreThan(new Date()),
        brand: IsNull(),
      },
    });

    //logic to get both available and unavailable vouchers
    //get voucher in wallet
    let bothAvailableAndUnavailableVouchers = (
      await voucherWalletRepository.find({
        where: {
          owner: { id: loginUser },
          status: VoucherWalletStatus.NOT_USED,
          voucher: {
            endTime: MoreThan(new Date()),
            brand: IsNull(),
          },
        },
        relations: {
          voucher: { applyProducts: true },
        },
      })
    ).map((wallet) => wallet.voucher);
    const allPlatformVoucherIdsInWallet = (
      await voucherWalletRepository.find({
        where: {
          owner: { id: loginUser },
          voucher: {
            brand: IsNull(),
          },
        },
        relations: {
          voucher: { applyProducts: true },
        },
      })
    ).map((wallet) => wallet.voucher.id);

    //get public vouchers
    bothAvailableAndUnavailableVouchers =
      bothAvailableAndUnavailableVouchers.concat(
        await voucherRepository.find({
          where: {
            amount: MoreThan(0),
            endTime: MoreThan(new Date()),
            brand: IsNull(),
            visibility: VoucherVisibilityEnum.PUBLIC,
            id: Not(In(allPlatformVoucherIdsInWallet)),
          },
          relations: {
            applyProducts: true ,
          },
        })
      );
    const availableVouchers: Voucher[] = [];
    const unAvailableVouchers: Voucher[] = [];

    bothAvailableAndUnavailableVouchers.forEach((voucher) => {
      if (new Date(voucher.startTime) > new Date()) {
        unAvailableVouchers.push(voucher);
      } else if ((voucher.applyType = VoucherApplyTypeEnum.SPECIFIC)) {
        const applyProductIds = voucher.applyProducts.map(
          (product) => product.id
        );
        const applyClassifications = originalClassifications.filter(
          (classification) => {
            if (classification.productDiscount) {
              return applyProductIds.includes(
                classification.productDiscount.product.id
              );
            }
            if (classification.preOrderProduct) {
              return applyProductIds.includes(
                classification.preOrderProduct.product.id
              );
            }
            return applyProductIds.includes(classification.product.id);
          }
        );
        if (applyClassifications.length == 0) {
          unAvailableVouchers.push(voucher);
        } else {
          const totalAmount = applyClassifications.reduce(
            (total, classification) => {
              const quantity = quantityMap.get(classification.id) || 0;
              const price = classification.price || 0;
              return total + price * quantity;
            },
            0
          );
          if (!voucher.minOrderValue || totalAmount >= voucher.minOrderValue) {
            availableVouchers.push(voucher);
          } else unAvailableVouchers.push(voucher);
        }
      } else {
        if (!voucher.minOrderValue || totalAmount >= voucher.minOrderValue) {
          availableVouchers.push(voucher);
        } else unAvailableVouchers.push(voucher);
      }
    });
    return {
      unclaimedVouchers,
      availableVouchers,
      unAvailableVouchers,
    };
  }
  async categorizeShopVouchersWhenCheckout(
    checkoutItemRequest: CheckoutItemRequest,
    loginUser: string
  ) {
    const classificationIds = checkoutItemRequest.brandItems.map(
      (item) => item.classificationId
    );
    const originalClassifications = await productClassificationRepository.find({
      where: { id: In(classificationIds) },
      relations: {
        product: { brand: true },
        productDiscount: { product: true },
        preOrderProduct: { product: true },
      },
    });

    // Tạo map từ classificationId sang quantity
    const quantityMap = new Map(
      checkoutItemRequest.brandItems.map((item) => [
        item.classificationId,
        item.quantity,
      ])
    );
    // Tính tổng amount
    const totalAmount = originalClassifications.reduce(
      (total, classification) => {
        const quantity = quantityMap.get(classification.id) || 0; // Lấy quantity tương ứng, mặc định là 0 nếu không có
        const price = classification.price || 0; // Đảm bảo price không bị null
        return total + price * quantity;
      },
      0
    );

    // logic to get unclaimedVouchers
    const walletVouchers = await voucherWalletRepository.find({
      where: {
        owner: { id: loginUser },
      },
      relations: {
        voucher: true,
      },
    });
    const claimedVoucherIds = walletVouchers.map((wallet) => wallet.voucher.id);
    const unclaimedVouchers = await voucherRepository.find({
      where: {
        id: Not(In(claimedVoucherIds)),
        visibility: VoucherVisibilityEnum.WALLET,
        endTime: MoreThan(new Date()),
        brand: { id: checkoutItemRequest.brandId },
      },
    });
    //logic to get both available and unavailable vouchers
    //get voucher in wallet
    let bothAvailableAndUnavailableVouchers = (
      await voucherWalletRepository.find({
        where: {
          owner: { id: loginUser },
          status: VoucherWalletStatus.NOT_USED,
          voucher: {
            endTime: MoreThan(new Date()),
            brand: { id: checkoutItemRequest.brandId },
          },
        },
        relations: {
          voucher: { applyProducts: true },
        },
      })
    ).map((wallet) => wallet.voucher);
    const allVoucherIdsInWalletOfTheBrand = (
      await voucherWalletRepository.find({
        where: {
          owner: { id: loginUser },
          voucher: {
            brand: { id: checkoutItemRequest.brandId },
          },
        },
        relations: {
          voucher: { applyProducts: true },
        },
      })
    ).map((wallet) => wallet.voucher.id);

    //get public vouchers
    bothAvailableAndUnavailableVouchers =
      bothAvailableAndUnavailableVouchers.concat(
        await voucherRepository.find({
          where: {
            amount: MoreThan(0),
            endTime: MoreThan(new Date()),
            brand: { id: checkoutItemRequest.brandId },
            visibility: VoucherVisibilityEnum.PUBLIC,
            id: Not(In(allVoucherIdsInWalletOfTheBrand)),
          },
          relations: {
            applyProducts: true,
          },
        })
      );
    const availableVouchers: Voucher[] = [];
    const unAvailableVouchers: Voucher[] = [];

    bothAvailableAndUnavailableVouchers.forEach((voucher) => {
      if (new Date(voucher.startTime) > new Date()) {
        unAvailableVouchers.push(voucher);
      } else if ((voucher.applyType = VoucherApplyTypeEnum.SPECIFIC)) {
        const applyProductIds = voucher.applyProducts.map(
          (product) => product.id
        );
        const applyClassifications = originalClassifications.filter(
          (classification) => {
            if (classification.productDiscount) {
              return applyProductIds.includes(
                classification.productDiscount.product.id
              );
            }
            if (classification.preOrderProduct) {
              return applyProductIds.includes(
                classification.preOrderProduct.product.id
              );
            }
            return applyProductIds.includes(classification.product.id);
          }
        );
        if (applyClassifications.length == 0) {
          unAvailableVouchers.push(voucher);
        } else {
          const totalAmount = applyClassifications.reduce(
            (total, classification) => {
              const quantity = quantityMap.get(classification.id) || 0;
              const price = classification.price || 0;
              return total + price * quantity;
            },
            0
          );
          if (!voucher.minOrderValue || totalAmount >= voucher.minOrderValue) {
            availableVouchers.push(voucher);
          } else unAvailableVouchers.push(voucher);
        }
      } else {
        if (!voucher.minOrderValue || totalAmount >= voucher.minOrderValue) {
          availableVouchers.push(voucher);
        } else unAvailableVouchers.push(voucher);
      }
    });
    return {
      unclaimedVouchers,
      availableVouchers,
      unAvailableVouchers,
    };
  }
  async getBestPlatformVouchersForProducts(
    getBestPlatformVouchersRequest: GetBestPlatformVouchersRequest,
    loginUser: string
  ) {
    const checkoutItems = getBestPlatformVouchersRequest.checkoutItems;
    const quantityMap = new Map(
      checkoutItems.map((item) => [item.classificationId, item.quantity])
    );
    const classificationIds = checkoutItems.map(
      (item) => item.classificationId
    );
    const classifications = await productClassificationRepository.find({
      where: { id: In(classificationIds) },
      relations: {
        product: { brand: true },
        productDiscount: { product: true },
      },
    });
    let availableVouchersInWallet = (
      await voucherWalletRepository.find({
        where: {
          owner: { id: loginUser },
          status: VoucherWalletStatus.NOT_USED,
          voucher: {
            startTime: LessThanOrEqual(new Date()),
            endTime: MoreThan(new Date()),
            brand: null,
          },
        },
        relations: {
          voucher: { applyProducts: true, brand: true },
        },
      })
    ).map((wallet) => wallet.voucher);

    const allPlatformVoucherIdsInWallet = (
      await voucherWalletRepository.find({
        where: {
          owner: { id: loginUser },
          voucher: {
            brand: IsNull(),
          },
        },
        relations: {
          voucher: { applyProducts: true },
        },
      })
    ).map((wallet) => wallet.voucher.id);

    const availableVouchers = availableVouchersInWallet.concat(
      await voucherRepository.find({
        where: {
          amount: MoreThan(0),
          startTime: LessThanOrEqual(new Date()),
          endTime: MoreThan(new Date()),
          brand: IsNull(),
          visibility: VoucherVisibilityEnum.PUBLIC,
          id: Not(In(allPlatformVoucherIdsInWallet)),
        },
        relations: {
          applyProducts: true,
        },
      })
    );
    let bestDiscount = 0;
    let bestVoucher = null;

    for (const voucher of availableVouchers) {
      const discount = this.calculateDiscountVoucherForProductClassifications(
        classifications,
        quantityMap,
        voucher
      );

      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestVoucher = voucher;
      }
    }
    return {
      bestVoucher,
      bestDiscount,
    };
  }
  async getBestShopVouchersForProducts(
    getBestShopVouchersRequest: GetBestShopVouchersRequest,
    loginUser: string
  ) {
    const response = [];

    for (const checkoutItem of getBestShopVouchersRequest.checkoutItems) {
      const quantityMap = new Map(
        checkoutItem.brandItems.map((item) => [
          item.classificationId,
          item.quantity,
        ])
      );
      const classificationIds = checkoutItem.brandItems.map(
        (item) => item.classificationId
      );
      const classifications = await productClassificationRepository.find({
        where: { id: In(classificationIds) },
        relations: {
          product: { brand: true },
          productDiscount: { product: true },
        },
      });
      let availableVouchersInWallet = (
        await voucherWalletRepository.find({
          where: {
            owner: { id: loginUser },
            status: VoucherWalletStatus.NOT_USED,
            voucher: {
              startTime: LessThanOrEqual(new Date()),
              endTime: MoreThan(new Date()),
              brand: { id: checkoutItem.brandId },
            },
          },
          relations: {
            voucher: { applyProducts: true },
          },
        })
      ).map((wallet) => wallet.voucher);
      const allVoucherIdsInWalletOfTheBrand = (
        await voucherWalletRepository.find({
          where: {
            owner: { id: loginUser },
            voucher: {
              brand: { id: checkoutItem.brandId },
            },
          },
          relations: {
            voucher: { applyProducts: true },
          },
        })
      ).map((wallet) => wallet.voucher.id);

      const availableVouchers = availableVouchersInWallet.concat(
        await voucherRepository.find({
          where: {
            amount: MoreThan(0),
            startTime: LessThanOrEqual(new Date()),
            endTime: MoreThan(new Date()),
            brand: { id: checkoutItem.brandId },
            visibility: VoucherVisibilityEnum.PUBLIC,
            id: Not(In(allVoucherIdsInWalletOfTheBrand)),
          },
          relations: {
            applyProducts: true,
          },
        })
      );
      let bestDiscount = 0;
      let bestVoucher = null;

      for (const voucher of availableVouchers) {
        const discount = this.calculateDiscountVoucherForProductClassifications(
          classifications,
          quantityMap,
          voucher
        );

        if (discount > bestDiscount) {
          bestDiscount = discount;
          bestVoucher = voucher;
        }
      }
      response.push({
        brandId: checkoutItem.brandId,
        bestVoucher,
        bestDiscount,
      });
    }
    return response;
  }

  calculateDiscountVoucherForProductClassifications(
    classifications: ProductClassification[],
    quantityMap: Map<string, number>,
    voucher: Voucher
  ) {
    let totalAmount = classifications.reduce((total, classification) => {
      const quantity = quantityMap.get(classification.id) || 0;
      const price = classification.price || 0;
      return total + price * quantity;
    }, 0);
    if (voucher.applyType == VoucherApplyTypeEnum.SPECIFIC) {
      const applyProductIds = voucher.applyProducts.map(
        (product) => product.id
      );
      const applyClassifications = classifications.filter((classification) => {
        if (classification.productDiscount) {
          return applyProductIds.includes(
            classification.productDiscount.product.id
          );
        }
        if (classification.preOrderProduct) {
          return applyProductIds.includes(classification.preOrderProduct.id);
        }
        return applyProductIds.includes(classification.product.id);
      });
      if (applyClassifications.length == 0) return 0;
      totalAmount = applyClassifications.reduce((total, classification) => {
        const quantity = quantityMap.get(classification.id) || 0;
        const price = classification.price || 0;
        return total + price * quantity;
      }, 0);
    }
    if (voucher.minOrderValue && totalAmount < voucher.minOrderValue) return 0;

    if (voucher.discountType == DiscountTypeEnum.AMOUNT) {
      return voucher.maxDiscount
        ? Math.min(totalAmount, voucher.discountValue, voucher.maxDiscount)
        : Math.min(totalAmount, voucher.discountValue);
    }
    if (voucher.discountType == DiscountTypeEnum.PERCENTAGE) {
      return voucher.maxDiscount
        ? Math.min(
            totalAmount,
            totalAmount * voucher.discountValue,
            voucher.maxDiscount
          )
        : Math.min(totalAmount, totalAmount * voucher.discountValue);
    }
  }

  async collectVoucher(voucherId: string, loginUser: string) {
    const voucher = await voucherRepository.findOne({
      where: {
        id: voucherId,
      },
    });
    if (!voucher) throw new BadRequestError('Voucher not found');
    if (voucher.visibility != VoucherVisibilityEnum.WALLET) {
      throw new BadRequestError('This voucher is not collectable');
    }
    const voucherWallet = voucherWalletRepository.findOne({
      where: {
        voucher: { id: voucherId },
      },
    });
    if (voucherWallet)
      throw new BadRequestError('Voucher has already been collected');
    const createdVoucherWallet = new VoucherWallet();
    createdVoucherWallet.voucher = voucher;
    createdVoucherWallet.owner.id = loginUser;
    await voucherWalletRepository.save(createdVoucherWallet);
  }
  async getPlatformVouchers() {
    const vouchers = await voucherRepository.find({
      where: { brand: null },
      relations: ['applyProducts'],
    });
    return vouchers;
  }
  async getByBrand(brandId: string) {
    const brand = await brandRepository.findOne({ where: { id: brandId } });
    if (!brand) throw new BadRequestError('Brand not found');
    const vouchers = await voucherRepository.find({
      where: { brand: { id: brandId } },
      relations: ['applyProducts'],
    });
    return vouchers;
  }

  constructor() {
    super(voucherRepository);
  }

  async validateShopVoucher(voucherId: string, accountId: string) {
    const shopVoucher = await voucherRepository.findOne({
      where: { id: voucherId },
      relations: {
        brand: true,
      },
    });
    if (!shopVoucher) throw new BadRequestError('Shop voucher not found');
    if (!shopVoucher.brand) {
      throw new BadRequestError('Shop voucher has no brand');
    }
    const now = new Date();
    let startTime = new Date(shopVoucher.startTime);
    let endTime = new Date(shopVoucher.endTime);
    if (now < startTime) {
      throw new BadRequestError('Shop voucher is not yet valid');
    }
    if (now > endTime) {
      throw new BadRequestError('Shop voucher has expired or is not yet valid');
    }
    if (shopVoucher.amount == 0) {
      throw new BadRequestError('Shop voucher is out of stock');
    }
    // Check if voucher was used in any order
    const existingOrder = await orderRepository.findOne({
      where: {
        account: { id: accountId },
        voucher: { id: voucherId },
        status: Not(
          In([
            ShippingStatusEnum.CANCELLED,
            ShippingStatusEnum.CANCELLED_BY_SHOP,
            ShippingStatusEnum.RETURN_REFUND,
          ])
        ),
      },
      relations: ['voucher', 'account'],
    });
    if (existingOrder) {
      throw new BadRequestError('Shop voucher has already been used');
    }
  }

  async validatePlatformVoucher(voucherId: string, accountId: string) {
    const platformVoucher = await voucherRepository.findOne({
      where: { id: voucherId },
      relations: { brand: true },
    });
    if (!platformVoucher)
      throw new BadRequestError('Platform voucher not found');
    if (platformVoucher.brand) {
      throw new BadRequestError('This is not a platform voucher');
    }
    const now = new Date();
    let startTime = new Date(platformVoucher.startTime);
    let endTime = new Date(platformVoucher.endTime);
    if (now < startTime) {
      throw new BadRequestError('Platform voucher is not yet valid');
    }
    if (now > endTime) {
      throw new BadRequestError(
        'Platform voucher has expired or is not yet valid'
      );
    }
    if (platformVoucher.amount == 0) {
      throw new BadRequestError('Platform voucher is out of stock');
    }
    // Check if voucher was used in any order
    const existingOrder = await orderRepository.findOne({
      where: {
        account: { id: accountId },
        voucher: { id: voucherId },
        status: Not(
          In([
            ShippingStatusEnum.CANCELLED,
            ShippingStatusEnum.CANCELLED_BY_SHOP,
            ShippingStatusEnum.RETURN_REFUND,
          ])
        ),
      },
      relations: ['voucher', 'account'],
    });
    if (existingOrder) {
      throw new BadRequestError('Platform voucher has already been used');
    }
  }

  applyShopVoucher(childOrder: Order) {
    const voucher = childOrder.voucher;
    console.log(voucher);

    let sumPrice = childOrder.orderDetails.reduce(
      (sum, orderDetail) => sum + orderDetail.subTotal,
      0
    );
    if (voucher.minOrderValue) {
      if (sumPrice < voucher.minOrderValue) {
        throw new BadRequestError(`Minimum order value is not enough`);
      }
    }
    if (voucher.discountType == DiscountTypeEnum.AMOUNT.toString()) {
      childOrder.orderDetails.forEach((orderDetail) => {
        orderDetail.shopVoucherDiscount = Math.round(
          Math.min(
            (orderDetail.subTotal / sumPrice) * voucher.discountValue,
            orderDetail.subTotal
          )
        );
        orderDetail.shopVoucherDiscount = Math.round(
          Math.min(
            (orderDetail.subTotal / sumPrice) * voucher.discountValue,
            orderDetail.subTotal
          )
        );
        orderDetail.totalPrice =
          orderDetail.subTotal - orderDetail.shopVoucherDiscount;
      });
    } else if (voucher.discountType == DiscountTypeEnum.PERCENTAGE.toString()) {
      let discountValueToAmount = Math.round(sumPrice * voucher.discountValue);
      if (voucher.maxDiscount)
        discountValueToAmount = Math.min(
          discountValueToAmount,
          voucher.maxDiscount
        );

      childOrder.orderDetails.forEach((orderDetail) => {
        orderDetail.shopVoucherDiscount = Math.round(
          Math.min(
            (orderDetail.subTotal / sumPrice) * discountValueToAmount,
            orderDetail.subTotal
          )
        );
        orderDetail.shopVoucherDiscount = Math.round(
          Math.min(
            (orderDetail.subTotal / sumPrice) * discountValueToAmount,
            orderDetail.subTotal
          )
        );
        orderDetail.totalPrice =
          orderDetail.subTotal - orderDetail.shopVoucherDiscount;
      });
    } else throw new BadRequestError(`Discount type voucher is not supported`);
  }

  applyPlatformVoucher(totalOrder: Order) {
    const voucher = totalOrder.voucher;
    const allOrderDetails = totalOrder.children.flatMap(
      (order) => order.orderDetails
    );
    let sumPrice = allOrderDetails.reduce(
      (sum, orderDetail) => sum + orderDetail.totalPrice,
      0
    );
    if (voucher.minOrderValue) {
      if (sumPrice < voucher.minOrderValue) {
        throw new BadRequestError(`Minimum order value is not enough`);
      }
    }
    if (voucher.discountType == DiscountTypeEnum.AMOUNT.toString()) {
      allOrderDetails.forEach((orderDetail) => {
        orderDetail.platformVoucherDiscount = Math.round(
          Math.min(
            (orderDetail.totalPrice / sumPrice) * voucher.discountValue,
            orderDetail.totalPrice
          )
        );
        orderDetail.platformVoucherDiscount = Math.round(
          Math.min(
            (orderDetail.totalPrice / sumPrice) * voucher.discountValue,
            orderDetail.totalPrice
          )
        );
        orderDetail.totalPrice -= orderDetail.platformVoucherDiscount;
      });
    } else if (voucher.discountType == DiscountTypeEnum.PERCENTAGE.toString()) {
      let discountValueToAmount = Math.round(sumPrice * voucher.discountValue);
      if (voucher.maxDiscount)
        discountValueToAmount = Math.min(
          discountValueToAmount,
          voucher.maxDiscount
        );
      allOrderDetails.forEach((orderDetail) => {
        orderDetail.platformVoucherDiscount = Math.round(
          Math.min(
            (orderDetail.totalPrice / sumPrice) * discountValueToAmount,
            orderDetail.totalPrice
          )
        );
        orderDetail.platformVoucherDiscount = Math.round(
          Math.min(
            (orderDetail.totalPrice / sumPrice) * discountValueToAmount,
            orderDetail.totalPrice
          )
        );
        orderDetail.totalPrice -= orderDetail.platformVoucherDiscount;
      });
    } else throw new BadRequestError(`Discount type voucher is not supported`);
  }

  calculateOrderPrice(totalOrder: Order) {
    totalOrder.subTotal = 0;
    totalOrder.totalPrice = 0;
    totalOrder.children.forEach((childOrder) => {
      childOrder.subTotal = 0;
      childOrder.totalPrice = 0;
      childOrder.orderDetails.forEach((orderDetail) => {
        childOrder.subTotal += orderDetail.subTotal;
        childOrder.totalPrice += orderDetail.totalPrice;
        childOrder.platformVoucherDiscount +=
          orderDetail.platformVoucherDiscount;
        childOrder.shopVoucherDiscount += orderDetail.shopVoucherDiscount;
      });
      totalOrder.subTotal += childOrder.subTotal;
      totalOrder.totalPrice += childOrder.totalPrice;
      totalOrder.platformVoucherDiscount += childOrder.platformVoucherDiscount;
      totalOrder.shopVoucherDiscount += childOrder.shopVoucherDiscount;
    });
  }

  async search(searches: SearchDTO[]) {
    const query = voucherRepository.createQueryBuilder('voucher');
    query.leftJoinAndSelect('voucher.brand', 'brand');

    searches.forEach((search) => {
      const { option, value } = search;

      switch (option) {
        case 'name':
          query.andWhere('voucher.name ILIKE :name', { name: `%${value}%` });
          break;
        case 'code':
          query.andWhere('voucher.code ILIKE :code', { code: `%${value}%` });
          break;
        case 'status':
          query.andWhere('voucher.status = :status', {
            status: value,
          });
          break;
        case 'brandId':
          query.andWhere('brand.id = :brandId', {
            brandId: value,
          });
          break;
        default:
          break;
      }
    });
    return await query.getMany();
  }

  async createVoucher(voucherRequest: VoucherRequest) {
    if (new Date(voucherRequest.startTime) > new Date(voucherRequest.endTime)) {
      throw new BadRequestError('The start time cannot be after the end time');
    }
    const existVoucherByName = await voucherRepository.findOne({
      where: {
        name: voucherRequest.name,
      },
    });
    if (existVoucherByName) {
      throw new BadRequestError('Name already exists');
    }
    const existVoucherByCode = await voucherRepository.findOne({
      where: {
        code: voucherRequest.code,
      },
    });
    if (existVoucherByCode) {
      throw new BadRequestError('Code already exists');
    }
    const voucherBody = new Voucher();
    Object.assign(voucherBody, voucherRequest);
    if (voucherRequest.brandId) {
      const brand = await brandRepository.findOne({
        where: { id: voucherRequest.brandId },
      });
      if (!brand) throw new BadRequestError('Brand not found');
      voucherBody.brand = brand;
    }
    if (voucherBody.applyType == VoucherApplyTypeEnum.SPECIFIC) {
      if (
        !voucherRequest.applyProductIds ||
        voucherRequest.applyProductIds.length == 0
      ) {
        throw new BadRequestError('Apply product ids must not be empty');
      }
      const applyProducts = await productRepository.find({
        where: { id: In(voucherRequest.applyProductIds) },
      });
      voucherBody.applyProducts = applyProducts;
    }
    await this.create(voucherBody);
  }

  async updateDetail(id: string, voucherRequest: VoucherRequest) {
    const voucher = await voucherService.findById(id);
    if (!voucher) throw new BadRequestError('Voucher not found');
    if (new Date(voucherRequest.startTime) > new Date(voucherRequest.endTime)) {
      throw new BadRequestError('The start time cannot be after the end time');
    }
    if (new Date() < new Date(voucher.startTime)) {
      throw new BadRequestError(
        'Cannot update a voucher that is already started'
      );
    }
    const existVoucherByName = await voucherRepository.findOne({
      where: {
        name: voucherRequest.name,
        id: Not(id),
      },
    });
    if (existVoucherByName) {
      throw new BadRequestError('Name already exists');
    }
    const existVoucherByCode = await voucherRepository.findOne({
      where: {
        code: voucherRequest.code,
        id: Not(id),
      },
    });
    if (existVoucherByCode) {
      throw new BadRequestError('Code already exists');
    }
    Object.assign(voucher, voucherRequest);
    if (voucherRequest.brandId) {
      const brand = await brandRepository.findOne({
        where: { id: voucherRequest.brandId },
      });
      if (!brand) throw new BadRequestError('Brand not found');
      voucher.brand = brand;
    }
    await this.update(id, voucher);
  }

  async getAll() {
    const vouchers = voucherRepository.find({
      relations: {
        brand: true,
        applyProducts: true,
      },
    });
    return plainToInstance(VoucherResponse, vouchers);
  }

  async getById(id: string) {
    const voucher = await voucherRepository.findOne({
      where: { id },
      relations: {
        brand: true,
      },
    });
    if (!voucher) throw new BadRequestError('Voucher not found');
    return plainToInstance(VoucherResponse, voucher);
  }
}

export const voucherService = new VoucherService();
