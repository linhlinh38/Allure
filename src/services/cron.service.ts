import cron from "node-cron";
import { AppDataSource } from "../dataSource";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import { ProductEnum, StatusEnum } from "../utils/enum";
import { Product } from "../entities/product.entity";
import { ProductDiscount } from "../entities/productDiscount.entity";
const startPreOrderCheck = () => {
  cron.schedule("* * * * *", async () => {
    const queryRunner = AppDataSource.createQueryRunner();
    console.log("cron running");

    try {
      await queryRunner.connect();

      const preOrderProducts = await queryRunner.manager.find(PreOrderProduct, {
        relations: ["product"],
      });

      const currentDate = new Date();

      for (const preOrder of preOrderProducts) {
        const startTime = new Date(preOrder.startTime);
        const endTime = new Date(preOrder.endTime);

        if (
          currentDate >= startTime &&
          currentDate <= endTime &&
          preOrder.product.status !== ProductEnum.PRE_ORDER &&
          preOrder.status === StatusEnum.ACTIVE
        ) {
          await queryRunner.manager.update(Product, preOrder.product.id, {
            status: ProductEnum.PRE_ORDER,
          });

          console.log(
            `Product ${preOrder.product.id} has been updated to PRE-ORDER status.`
          );
        }
      }
    } catch (error) {
      console.error("Error updating pre-order products:", error);
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

        const checkOutOfStocks = preOrderClassifications.filter(
          (p) => p.quantity !== 0
        );

        const endTime = new Date(preOrder.endTime);

        if (
          (currentDate > endTime && preOrder.status === "ACTIVE") ||
          checkOutOfStocks.length === 0
        ) {
          await queryRunner.manager.update(PreOrderProduct, preOrder.id, {
            status: StatusEnum.INACTIVE,
          });

          await queryRunner.manager.update(Product, preOrder.product.id, {
            status: ProductEnum.OUT_OF_STOCK,
          });

          console.log(
            `PreOrderProduct ${preOrder.id} marked as INACTIVE and Product ${preOrder.product.id} marked as OUT_OF_STOCK.`
          );
        }
      }
    } catch (error) {
      console.error("Error updating expired pre-order products:", error);
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

      const productDiscounts = await queryRunner.manager.find(ProductDiscount, {
        relations: ["product"],
      });

      const currentDate = new Date();

      for (const productDiscount of productDiscounts) {
        const startTime = new Date(productDiscount.startTime);
        const endTime = new Date(productDiscount.endTime);

        if (
          currentDate >= startTime &&
          currentDate <= endTime &&
          productDiscount.product.status !== ProductEnum.FLASH_SALE &&
          productDiscount.status === StatusEnum.ACTIVE
        ) {
          await queryRunner.manager.update(
            Product,
            productDiscount.product.id,
            {
              status: ProductEnum.FLASH_SALE,
            }
          );

          console.log(
            `Product ${productDiscount.product.id} has been updated to FLASH_SALE status.`
          );
        }
      }
    } catch (error) {
      console.error("Error updating FLASH_SALE products:", error);
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

      const productDiscounts = await queryRunner.manager
        .createQueryBuilder(ProductDiscount, "productDiscount")
        .leftJoinAndSelect("productDiscount.product", "product")
        .leftJoinAndSelect(
          "product.productClassifications",
          "productClassifications"
        )
        .where("productDiscount.status = :status", {
          status: StatusEnum.ACTIVE,
        })
        .getMany();
      const currentDate = new Date();

      for (const discount of productDiscounts) {
        const classifications = discount.product.productClassifications || [];

        const checkOutOfStocks = classifications.filter(
          (p) => p.quantity !== 0
        );

        const endTime = new Date(discount.endTime);

        if (checkOutOfStocks.length === 0) {
          await queryRunner.manager.update(ProductDiscount, discount.id, {
            status: StatusEnum.INACTIVE,
          });

          await queryRunner.manager.update(Product, discount.product.id, {
            status: ProductEnum.OUT_OF_STOCK,
          });

          console.log(
            `PreOrderProduct ${discount.id} marked as INACTIVE and Product ${discount.product.id} marked as OUT_OF_STOCK.`
          );
        }

        if (currentDate > endTime && discount.status === "ACTIVE") {
          await queryRunner.manager.update(ProductDiscount, discount.id, {
            status: StatusEnum.INACTIVE,
          });

          await queryRunner.manager.update(Product, discount.product.id, {
            status: ProductEnum.OFFICIAL,
          });

          console.log(
            `PreOrderProduct ${discount.id} marked as INACTIVE and Product ${discount.product.id} marked as OFFICIAL.`
          );
        }
      }
    } catch (error) {
      console.error("Error updating expired pre-order products:", error);
    } finally {
      await queryRunner.release();
    }
  });
};

startPreOrderCheck();
endPreOrderCheck();
startProductDiscount();
endProductDiscount();
