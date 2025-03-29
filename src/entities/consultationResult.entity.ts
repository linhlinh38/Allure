import { Entity, Column, ManyToOne, JoinColumn, OneToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { ConsultationCriteria } from "./consultationCriteria.entity";
import { Booking } from "./booking.entity";

@Entity("consultation_results")
export class ConsultationResult extends BaseEntity {
  @ManyToOne(
    () => ConsultationCriteria,
    (criteria) => criteria.consultationResults,
    {
      nullable: false,
    }
  )
  @JoinColumn({ name: "consultation_criteria_id" })
  consultationCriteria: ConsultationCriteria;

  @OneToOne(() => Booking, (booking) => booking.consultationResult)
  @JoinColumn({ name: "booking_id" })
  booking: Booking;

  @Column({ type: "jsonb", nullable: false })
  criteria: object[];

  @Column({ type: "jsonb", nullable: false })
  results: object[];

  @Column({ type: "jsonb", nullable: true })
  suggestedProductClassifications: {
    productClassificationId: string;
    name: string;
  }[];
}
