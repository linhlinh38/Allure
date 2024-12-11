import { Column, Entity, JoinColumn, ManyToMany, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { StatusEnum } from '../utils/enum';
import { Brand } from './brand.entity';
import { Order } from './order.entity';

@Entity('vouchers')
export class Voucher extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  type: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  discountType: string;

  @Column({ type: 'double precision' })
  discountValue: number;

  @Column({ type: 'double precision', nullable: true })
  maxDiscount: number;

  @Column({ type: 'double precision', nullable: true })
  minOrderValue: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @Column({ type: 'integer' })
  amount: number;

  @Column({ type: 'timestamp' })
  startTime: Date;

  @Column({ type: 'timestamp' })
  endTime: Date;

  @ManyToOne(() => Brand, (brand) => brand.vouchers)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @OneToMany(() => Order, (order) => order.voucher)
  orders: Order[];
}
