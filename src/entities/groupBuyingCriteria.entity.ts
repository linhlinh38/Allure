import { Column, Entity, ManyToOne, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { GroupBuying } from './groupBuying.entity';
import { Voucher } from './voucher.entity';
import { GroupProduct } from './groupProduct.entity';
@Entity('group_buying_criterias')
export class GroupBuyingCriteria extends BaseEntity {
  @OneToOne(() => GroupBuying, (groupBuying) => groupBuying.criteria, {
    cascade: true,
    nullable: true,
  })
  groupBuying: GroupBuying;

  @ManyToOne(() => GroupProduct, (groupProduct) => groupProduct.criterias, {
    nullable: true,
  })
  groupProduct: GroupProduct;

  @ManyToOne(() => Voucher, (voucher) => voucher.criteria, { cascade: true })
  voucher: Voucher;

  @Column({ type: 'integer', nullable: false })
  threshold: number;
}
