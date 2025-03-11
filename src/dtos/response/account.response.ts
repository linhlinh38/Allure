import { AccountStatusEnum, GenderEnum } from "../../utils/enum";
import { Exclude } from "class-transformer";

export class AccountResponse {
  id: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  email: string;
  role: string;
  gender?: GenderEnum;
  phone?: string;
  dob?: Date;
  avatar?: string;
  status: AccountStatusEnum;
  createdAt: string;
  updatedAt: string;

  @Exclude()
  password?: string;
}
