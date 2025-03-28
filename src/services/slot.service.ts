import { In } from 'typeorm';
import { AppDataSource } from '../dataSource';
import {
  SlotRequest,
  UpdateWorkingSlotRequest,
  ActiveSlotRequest,
} from '../dtos/request/slot.request';
import { Slot } from '../entities/slot.entity';
import { BaseService } from './base.service';
import { accountRepository } from '../repositories/account.repository';
import { BadRequestError } from '../errors/error';
import { RoleEnum } from '../utils/enum';
import { Account } from '../entities/account.entity';
import Logging from '../utils/Logging';

const repository = AppDataSource.getRepository(Slot);
class SlotService extends BaseService<Slot> {
  async getWorkingSlotsOfConsultant(accountId: string) {
    const account = await accountRepository.findOne({
      where: {
        id: accountId,
      },
      relations: {
        workingSlots: true,
      },
    });
    if (!account) throw new BadRequestError('Account not found');
    return account.workingSlots;
  }
  async updateWorkingSlot(
    updateWorkingSlotRequest: UpdateWorkingSlotRequest,
    loginUser: string
  ) {
    const slots = await repository.find({
      where: {
        id: In(updateWorkingSlotRequest.slotIds),
      },
    });

    // Kiểm tra xem có slot nào inactive không
    const inactiveSlots = slots.filter((slot) => !slot.isActive);
    if (inactiveSlots.length > 0) {
      throw new BadRequestError('Some slots are not active');
    }

    const account = await accountRepository.findOne({
      where: {
        id: loginUser,
      },
    });
    account.workingSlots = slots;
    await account.save();
  }

  async bulkCreate(slotsRequest: SlotRequest) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const slots = slotsRequest.slots.map((slot) => {
        return repository.create({
          weekDay: slot.weekDay,
          startTime: slot.startTime,
          endTime: slot.endTime,
        });
      });
      await queryRunner.manager.save(slots);

      // Lấy tất cả slots (bao gồm cả slots mới) từ transaction
      const allSlots = await queryRunner.manager.find(Slot, {});

      const accounts = await queryRunner.manager.find(Account, {
        where: {
          role: { role: In([RoleEnum.ADMIN, RoleEnum.OPERATOR]) },
        },
        relations: {
          workingSlots: true,
        },
      });

      // Cập nhật working slots mới cho tất cả accounts
      accounts.forEach((account) => {
        account.workingSlots = allSlots;
      });
      await queryRunner.manager.save(accounts);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getAll() {
    return await repository.find({
      order: {
        weekDay: 'ASC',
        startTime: 'ASC',
      },
    });
  }

  async activeSlots(activeSlotsRequest: ActiveSlotRequest) {
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      // Inactive all slots
      await queryRunner.manager.update(Slot, {}, { isActive: false });

      // Active specified slots
      if (activeSlotsRequest.slotIds.length > 0) {
        await queryRunner.manager.update(
          Slot,
          { id: In(activeSlotsRequest.slotIds) },
          { isActive: true }
        );
      }

      // Get all operator and consultant accounts
      const accounts = await queryRunner.manager.find(Account, {
        where: {
          role: { role: In([RoleEnum.OPERATOR, RoleEnum.CONSULTANT]) },
        },
        relations: {
          workingSlots: true,
        },
      });

      // Update working slots for each account to only include active slots
      accounts.forEach((account) => {
        account.workingSlots = account.workingSlots.filter(
          (slot) => slot.isActive
        );
      });

      await queryRunner.manager.save(accounts);

      await queryRunner.commitTransaction();
      Logging.info(
        'Successfully updated slots active status and account working slots'
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      Logging.error('Error updating slots active status:');
      Logging.error(error);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  constructor() {
    super(repository);
  }
}
export const slotService = new SlotService();
