import cron from "node-cron";
import { AppDataSource } from "../dataSource";
import { PreOrderProduct } from "../entities/preOrderProduct.entity";
import { ProductEnum, StatusEnum } from "../utils/enum";
import { Product } from "../entities/product.entity";
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

startPreOrderCheck();
endPreOrderCheck();
