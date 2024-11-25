import { Brand } from '../../entities/brand.entity';
import { StatusEnum } from '../../utils/enum';

export class VoucherResponse {
  id: string;

  name: string;

  type: string;

  document: string;

  value: number;

  status: StatusEnum;

  brand: Brand;

  createdAt: string;

  updatedAt: string;
}
