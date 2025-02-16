import { Column, Entity, ManyToOne} from 'typeorm';
import { BaseEntity } from './base.entity';
import { Voucher } from './voucher.entity';
import { GroupProduct } from './groupProduct.entity';
@Entity('group_buying_criterias')
export class GroupBuyingCriteria extends BaseEntity {
  @ManyToOne(() => GroupProduct, (groupProduct) => groupProduct.criterias, {
    nullable: true,
  })
  groupProduct: GroupProduct;

  @ManyToOne(() => Voucher, (voucher) => voucher.criteria, { cascade: true })
  voucher: Voucher;

  @Column({ type: 'integer', nullable: false })
  threshold: number;
}
