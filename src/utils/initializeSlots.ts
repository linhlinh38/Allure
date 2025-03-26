import { slotRepository } from '../repositories/slot.repository';
import * as fs from 'fs';
import * as path from 'path';
import Logging from './Logging';

export const initializeSlots = async () => {
  try {
    // Check if slots exist
    const existingSlots = await slotRepository.find();
    if (existingSlots.length > 0) {
      Logging.info('Slots already exist in database');
      return;
    }

    // Read slots from JSON file
    const slotsFilePath = path.join(__dirname, '../data/slots.json');
    const slotsData = JSON.parse(fs.readFileSync(slotsFilePath, 'utf8'));

    // Create slots
    const slots = slotsData.slots.map((slot: any) => {
      return slotRepository.create({
        weekDay: slot.weekDay,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    });

    // Save slots to database
    await slotRepository.save(slots);
    Logging.info('Successfully initialized slots');
  } catch (error) {
    Logging.error('Error initializing slots:');
    Logging.error(error);
  }
};
