import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { StatusTracking } from './statusTracking.entity';
import { Feedback } from './feedback.entity';
import { BaseEntity } from './base.entity';

@Entity('media_files')
export class MediaFile extends BaseEntity {
  @Column({ name: 'file_url', type: 'varchar', nullable: false })
  fileUrl: string;

  @ManyToOne(
    () => StatusTracking,
    (statusTracking) => statusTracking.mediaFiles,
    { nullable: true }
  )
  @JoinColumn({ name: 'status_tracking_id' })
  statusTracking: StatusTracking;

  @ManyToOne(() => Feedback, (feedback) => feedback.mediaFiles, {
    nullable: true,
  })
  @JoinColumn({ name: 'feedback_id' })
  feedback: Feedback;
}
