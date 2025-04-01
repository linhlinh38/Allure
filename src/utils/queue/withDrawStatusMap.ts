import { WithdrawalStatusEnum } from '../enum';

const nextWithDrawStatusMap = {
  [WithdrawalStatusEnum.PENDING]: ['APPROVED', 'REJECTED', 'CANCELLED'],
  [WithdrawalStatusEnum.APPROVED]: ['COMPLETED', 'REJECTED'],
};

export { nextWithDrawStatusMap };
