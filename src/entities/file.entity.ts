import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { FileEnum, StatusEnum } from "../utils/enum";
import { Account } from "./account.entity";
import { Brand } from "./brand.entity";
import { Product } from "./product.entity";
import { Report } from "./report.entity";

@Entity("files")
export class File extends BaseEntity {
  @Column({ type: 'varchar', nullable: true })
  name?: string;

  @Column({ type: 'varchar', nullable: false })
  fileUrl: string;

  @Column({
    type: "enum",
    enum: FileEnum,
    nullable: true,
  })
  type: FileEnum;

  @Column({
    type: "enum",
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @ManyToOne(() => Account, (account) => account.files, { nullable: true })
  @JoinColumn({ name: "account_id" })
  account: Account;

  @ManyToOne(() => Brand, (brand) => brand.documents, { nullable: true })
  @JoinColumn({ name: "brand_id" })
  brand: Brand;

  @ManyToOne(() => Product, (product) => product.certificates, {
    nullable: true,
  })
  @JoinColumn({ name: "product_id" })
  product: Product;

  @ManyToOne(() => Report, (report) => report.files, { nullable: true })
  @JoinColumn({ name: "report_id" })
  report: Report;
}
