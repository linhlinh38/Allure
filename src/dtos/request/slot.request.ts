import { z } from 'zod';
import { WeekDay } from '../../utils/enum';
import { Expose } from 'class-transformer';

export const SlotSchema = z.object({
  weekDay: z.nativeEnum(WeekDay),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format (HH:MM)'),
});

export const BulkSlotCreateSchema = z.object({
  body: z.object({
    slots: z.array(SlotSchema),
  }),
});

export const UpdateWokingSlotSchema = z.object({
  body: z.object({
    slotIds: z.array(z.string()),
  }),
});

export class UpdateWorkingSlotRequest {
  slotIds: string[];
}

export class SlotItem {
  weekDay: WeekDay;
  startTime: string;
  endTime: string;
}

export class SlotRequest {
  @Expose()
  slots: SlotItem[];
}
