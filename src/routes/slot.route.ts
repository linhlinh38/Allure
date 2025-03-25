import express from 'express';
import authentication from '../middleware/authentication';
import validate from '../utils/validate';
import {
  BulkSlotCreateSchema,
  UpdateWokingSlotSchema,
  UpdateSlotSchema,
} from '../dtos/request/slot.request';
import SlotController from '../controllers/slot.controller';
const slotRouter = express.Router();

slotRouter.get('/', SlotController.getAll);

slotRouter.use(authentication);

slotRouter.post(
  '/bulk-create',
  validate(BulkSlotCreateSchema),
  SlotController.bulkCreate
);
slotRouter.post(
  '/update-working-slots',
  validate(UpdateWokingSlotSchema),
  SlotController.updateWorkingSlot
);
slotRouter.get(
  '/get-working-slots-of-consultant/:accountId',
  SlotController.getWorkingSlotsOfConsultant
);
slotRouter.post(
  '/update-slot/:id',
  validate(UpdateSlotSchema),
  SlotController.updateSlot
);
export default slotRouter;
