import cron from "node-cron";
import { AppDataSource } from "../dataSource";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import {
  PreOrderProductEnum,
  ProductDiscountEnum,
  ProductEnum,
  StatusEnum,
} from "../utils/enum";
import { Product } from "../entities/product.entity";
import { ProductDiscount } from "../entities/productDiscount.entity";
const startPreOrderCheck = () => {
  cron.schedule("* * * * *", async () => {
    const queryRunner = AppDataSource.createQueryRunner();
    console.log("cron running");

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const preOrderProducts = await queryRunner.manager.find(PreOrderProduct, {
        relations: ["product", "productClassifications"],
      });

      const currentDate = new Date();

      for (const preOrder of preOrderProducts) {
        const startTime = new Date(preOrder.startTime);
        const endTime = new Date(preOrder.endTime);
        const preOrderClassifications = preOrder.productClassifications || [];

        const checkQuantity = preOrderClassifications.filter(
          (p) => p.quantity !== 0
        );

        if (
          currentDate >= startTime &&
          currentDate <= endTime &&
          preOrder.status === PreOrderProductEnum.WAITING &&
          preOrder.product.status !== ProductEnum.INACTIVE &&
          preOrder.product.status !== ProductEnum.BANNED &&
          checkQuantity.length > 0
        ) {
          await queryRunner.manager.update(PreOrderProduct, preOrder.id, {
            status: PreOrderProductEnum.ACTIVE,
          });

          console.log(
            `Pre order Product ${preOrder.product.id} has been updated to ACTIVE status.`
          );
        }
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error updating pre-order products:", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  });
};

const endPreOrderCheck = () => {
  cron.schedule("* * * * *", async () => {
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const preOrderProducts = await queryRunner.manager
        .createQueryBuilder(PreOrderProduct, "preOrderProduct")
        .leftJoinAndSelect(
          "preOrderProduct.productClassifications",
          "productClassification"
        )
        .leftJoinAndSelect("preOrderProduct.product", "product")
        .where("preOrderProduct.status = :status", {
          status: StatusEnum.ACTIVE,
        })
        .getMany();
      const currentDate = new Date();

      for (const preOrder of preOrderProducts) {
        const preOrderClassifications = preOrder.productClassifications || [];

        const checkQuantity = preOrderClassifications.filter(
          (p) => p.quantity !== 0
        );

        const endTime = new Date(preOrder.endTime);

        if (checkQuantity.length === 0) {
          await queryRunner.manager.update(PreOrderProduct, preOrder.id, {
            status: PreOrderProductEnum.SOLD_OUT,
          });

          console.log(`PreOrderProduct ${preOrder.id} marked as SOLD_OUT`);
        }
        if (currentDate > endTime && preOrder.status === "ACTIVE") {
          await queryRunner.manager.update(PreOrderProduct, preOrder.id, {
            status: PreOrderProductEnum.INACTIVE,
          });

          console.log(`PreOrderProduct ${preOrder.id} marked as INACTIVE`);
        }
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error end pre-order products:", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  });
};

const startProductDiscount = () => {
  cron.schedule("* * * * *", async () => {
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const productDiscounts = await queryRunner.manager.find(ProductDiscount, {
        relations: ["product", "productClassifications"],
      });

      const currentDate = new Date();

      for (const productDiscount of productDiscounts) {
        const productDiscountClassifications =
          productDiscount.productClassifications || [];

        const checkQuantity = productDiscountClassifications.filter(
          (p) => p.quantity !== 0
        );

        const startTime = new Date(productDiscount.startTime);
        const endTime = new Date(productDiscount.endTime);

        if (
          currentDate >= startTime &&
          currentDate <= endTime &&
          productDiscount.product.status !== ProductEnum.INACTIVE &&
          productDiscount.product.status !== ProductEnum.BANNED &&
          productDiscount.status === ProductDiscountEnum.WAITING &&
          checkQuantity.length > 0
        ) {
          await queryRunner.manager.update(
            Product,
            productDiscount.product.id,
            {
              status: ProductEnum.FLASH_SALE,
            }
          );

          await queryRunner.manager.update(
            ProductDiscount,
            productDiscount.id,
            {
              status: ProductDiscountEnum.ACTIVE,
            }
          );

          console.log(
            `Product ${productDiscount.product.id} has been updated to FLASH_SALE status.`
          );
        }
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error update flashsale products:", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  });
};

const endProductDiscount = () => {
  cron.schedule("* * * * *", async () => {
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const productDiscounts = await queryRunner.manager
        .createQueryBuilder(ProductDiscount, "productDiscount")
        .leftJoinAndSelect("productDiscount.product", "product")
        .leftJoinAndSelect(
          "productDiscount.productClassifications",
          "productClassifications"
        )
        .where("productDiscount.status = :status", {
          status: StatusEnum.ACTIVE,
        })
        .getMany();
      const currentDate = new Date();

      for (const discount of productDiscounts) {
        const productDiscountClassifications =
          discount.productClassifications || [];

        const checkQuantity = productDiscountClassifications.filter(
          (p) => p.quantity !== 0
        );

        const endTime = new Date(discount.endTime);

        if (checkQuantity.length === 0) {
          await queryRunner.manager.update(ProductDiscount, discount.id, {
            status: ProductDiscountEnum.SOLD_OUT,
          });

          await queryRunner.manager.update(Product, discount.product.id, {
            status: ProductEnum.OFFICIAL,
          });

          console.log(
            `ProductDiscount ${discount.id} marked as SOLD_OUT and Product ${discount.product.id} marked as OFFICIAL.`
          );
        }

        if (currentDate > endTime && discount.status === "ACTIVE") {
          await queryRunner.manager.update(ProductDiscount, discount.id, {
            status: ProductDiscountEnum.INACTIVE,
          });

          await queryRunner.manager.update(Product, discount.product.id, {
            status: ProductEnum.OFFICIAL,
          });

          console.log(
            `ProductDiscount ${discount.id} marked as INACTIVE and Product ${discount.product.id} marked as OFFICIAL.`
          );
        }
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error end flashsale products:", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  });
};

const autoCheckOutOfStock = () => {
  cron.schedule("* * * * *", async () => {
    const queryRunner = AppDataSource.createQueryRunner();

    try {
      await queryRunner.connect();
      await queryRunner.startTransaction();

      const products = await queryRunner.manager
        .createQueryBuilder(Product, "product")
        .leftJoinAndSelect(
          "product.productClassifications",
          "productClassifications",
          "productClassifications.status = :classification_status",
          { classification_status: StatusEnum.ACTIVE }
        )
        .where("product.status = :status", {
          status: ProductEnum.OFFICIAL,
        })

        .getMany();

      for (const product of products) {
        const productClassifications = product.productClassifications || [];

        const checkQuantity = productClassifications.filter(
          (p) => p.quantity !== 0
        );

        if (checkQuantity.length === 0) {
          await queryRunner.manager.update(Product, product.id, {
            status: ProductEnum.OUT_OF_STOCK,
          });

          console.log(`Product ${product.id} marked as OUT_OF_STOCK.`);
        }
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      console.error("Error check stock products:", error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  });
};

startPreOrderCheck();
endPreOrderCheck();
startProductDiscount();
endProductDiscount();
autoCheckOutOfStock();
