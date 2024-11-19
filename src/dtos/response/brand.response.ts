import { Account } from '../../entities/account.entity';
import { GenderEnum, RoleEnum, StatusEnum } from '../../utils/enum';

export class BrandResponse {
  name: string;

  logo: string;

  document: string;

  description: string;

  account: Account;

  email: string;

  phone: string;

  address: string;

  star: number;

  numOfFollower: number;

  status: StatusEnum;
}
