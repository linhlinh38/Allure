import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { StatusEnum } from '../utils/enum';
import { GroupBuyingCriteria } from './groupBuyingCriteria.entity';
import { Product } from './product.entity';
import { GroupBuying } from './groupBuying.entity';

@Entity('group_products')
export class GroupProduct extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'integer', nullable: true})
  maxBuyAmountEachPerson: number;

  @OneToMany(() => GroupBuyingCriteria, (criteria) => criteria.groupProduct, {
    cascade: true,
  })
  criterias: GroupBuyingCriteria[];

  @Column({
    type: 'enum',
    enum: StatusEnum,
    default: StatusEnum.ACTIVE,
  })
  status: StatusEnum;

  @ManyToMany(() => Product, (product) => product.groupProducts)
  @JoinTable({
    name: 'group_product_to_product', // Tên bảng trung gian
    joinColumn: {
      name: 'groupProductId', // Tên cột tham chiếu GroupProduct
      referencedColumnName: 'id', // Tên cột chính trong GroupProduct
    },
    inverseJoinColumn: {
      name: 'productId', // Tên cột tham chiếu Product
      referencedColumnName: 'id', // Tên cột chính trong Product
    },
  })
  products: Product[];

  @OneToMany(() => GroupBuying, (groupBuying) => groupBuying.groupProduct)
  groupBuyings: GroupBuying;
}
