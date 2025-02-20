import { Column, Entity, OneToMany } from "typeorm";
import { BaseEntity } from "./base.entity";
import { WeekDay } from "../utils/enum";
import { Booking } from "./booking.entity";

@Entity("slots")
export class Slot extends BaseEntity {
  @Column({ type: "enum", enum: WeekDay })
  weekDay: WeekDay;

  @Column({ type: "varchar", length: 10 })
  startTime: string;

  @Column({ type: "varchar", length: 10 })
  endTime: string;

  @OneToMany(() => Booking, (booking) => booking.slot)
  bookings: Booking[];
}
