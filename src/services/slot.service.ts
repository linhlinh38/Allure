import { In } from 'typeorm';
import { AppDataSource } from '../dataSource';
import {
  SlotRequest,
  UpdateWorkingSlotRequest,
} from '../dtos/request/slot.request';
import { Slot } from '../entities/slot.entity';
import { BaseService } from './base.service';
import { accountRepository } from '../repositories/account.repository';
import { BadRequestError } from '../errors/error';

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
    const account = await accountRepository.findOne({
      where: {
        id: loginUser,
      },
    });
    account.workingSlots = slots;
    await account.save();
  }

  async bulkCreate(slotsRequest: SlotRequest) {
    const slots = slotsRequest.slots.map((slot) => {
      return repository.create({
        weekDay: slot.weekDay,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    });
    await repository.save(slots);
  }

  async getAll() {
    return await repository.find({
      order: {
        weekDay: 'ASC',
        startTime: 'ASC',
      },
    });
  }

  constructor() {
    super(repository);
  }
}
export const slotService = new SlotService();
