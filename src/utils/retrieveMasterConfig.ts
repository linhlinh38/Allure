import { IsNull, Not } from 'typeorm';
import { masterConfigRepository } from '../repositories/masterConfig.repository';

export const retrieveMasterConfig = async () => {
  return await masterConfigRepository.findOne({
    where: {
      id: Not(IsNull()),
    },
  });
};
