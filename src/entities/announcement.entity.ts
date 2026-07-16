import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AnnouncementPriority } from '../common/enums';
import { Event } from './event.entity';

@Entity('announcements')
export class Announcement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  @Column({ type: 'varchar', length: 20, default: AnnouncementPriority.NORMAL })
  priority: AnnouncementPriority;

  @Column({ name: 'published_at', type: Date })
  publishedAt: Date;

  @Column({ name: 'expires_at', type: Date, nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById: string | null;

  @Column({ name: 'deleted_by_id', type: 'uuid', nullable: true })
  deletedById: string | null;

  @Column({ name: 'deleted_at', type: Date, nullable: true })
  deletedAt: Date | null;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Event, (event) => event.announcements)
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
