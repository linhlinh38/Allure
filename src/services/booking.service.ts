import { AppDataSource } from '../dataSource';
import { Booking } from '../entities/booking.entity';
import { BadRequestError } from '../errors/error';
import { BaseService } from './base.service';

const repository = AppDataSource.getRepository(Booking);
class BookingService extends BaseService<Booking> {
  async getStatusBookingInterview(loginUser: string) {
    const bookings = await repository.find({
      where: { account: { id: loginUser } },
      relations: ['slot'],
      order: { createdAt: 'DESC' },
      take: 1,
    });
    const booking = bookings[0];
    if (!booking) throw new BadRequestError('Booking not found');
    return booking.status;
  }
  constructor() {
    super(repository);
  }
}
export const bookingService = new BookingService();
