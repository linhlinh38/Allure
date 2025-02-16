import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { StatusTracking } from "./statusTracking.entity";

@Entity('status_tracking_media_file')
export class StatusTrackingMediaFile extends BaseEntity {
  @Column({ name: 'file_url', type: 'varchar', length: 100, nullable: false })
  fileUrl: string;

  @ManyToOne(
    () => StatusTracking,
    (statusTracking) => statusTracking.mediaFiles
  )
  @JoinColumn({ name: 'status_tracking_id' })
  statusTracking: StatusTracking;
}
