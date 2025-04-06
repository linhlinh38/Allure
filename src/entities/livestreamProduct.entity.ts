import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { LiveStream } from "./livestream.entity";
import { Product } from "./product.entity";
import { BaseEntity } from "./base.entity";

@Entity("livestream_products")
export class LivestreamProduct extends BaseEntity {
  @ManyToOne(() => LiveStream, (livestream) => livestream.livestreamProducts)
  @JoinColumn({ name: "livestream_id" })
  livestream: LiveStream;

  @ManyToOne(() => Product, (product) => product.livestreamProducts)
  @JoinColumn({ name: "product_id" })
  product: Product;

  @Column({ type: "double precision", nullable: true })
  discount: number; // Discount for the product in the livestream
}
