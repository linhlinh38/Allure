import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "./base.entity";
import { Feedback } from "./feedback.entity";

@Entity('feedback_media_file')
export class FeedbackMediaFile extends BaseEntity {
  @Column({ name: 'file_url', type: 'varchar', length: 100, nullable: false })
  fileUrl: string;

    @ManyToOne(() => Feedback, (feedback) => feedback.mediaFiles)
    @JoinColumn({ name: 'feedback_id' })
    feedback: Feedback;
}
