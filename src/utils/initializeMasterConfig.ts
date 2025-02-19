import { masterConfigRepository } from '../repositories/masterConfig.repository';

export const initializeMasterConfig = async () => {
  const count = await masterConfigRepository.count();
  if (count === 0) {
    const newConfig = masterConfigRepository.create({});

    await masterConfigRepository.save(newConfig);
    console.log('✅ MasterConfig đã được tạo!');
  } else {
    console.log('✅ MasterConfig đã tồn tại, không cần tạo mới.');
  }
};
