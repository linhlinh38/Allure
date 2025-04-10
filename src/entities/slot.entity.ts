import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { WeekDay } from "../utils/enum";
import { Booking } from "./booking.entity";

@Entity("slots")
export class Slot extends BaseEntity {
  @Column({ type: "enum", enum: WeekDay, name: "week_day" })
  weekDay: WeekDay;

  @Column({ type: "varchar", length: 10, name: "start_time" })
  startTime: string;

  @Column({ type: "varchar", length: 10, name: "end_time" })
  endTime: string;

  @Column({ type: "boolean", default: false, name: "is_active" })
  isActive: boolean;

  @OneToMany(() => Booking, (booking) => booking.slot)
  bookings: Booking[];
}
