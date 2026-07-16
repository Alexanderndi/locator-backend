import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { EventStatus } from '../common/enums';
import { Organization } from './organization.entity';
import { Venue } from './venue.entity';
import { Vendor } from './vendor.entity';
import { Category } from './category.entity';
import { ScheduleItem } from './schedule-item.entity';
import { Announcement } from './announcement.entity';
import { VenueMap } from './venue-map.entity';

@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  organizationId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'varchar', length: 50, default: 'Africa/Lagos' })
  timezone: string;

  @Column({ type: 'varchar', length: 20, default: EventStatus.DRAFT })
  status: EventStatus;

  @Column({ name: 'venue_id', type: 'uuid', nullable: true })
  venueId: string | null;

  @Column({ name: 'cover_image_url', type: 'text', nullable: true })
  coverImageUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Organization, (org) => org.events)
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => Venue, (venue) => venue.events)
  @JoinColumn({ name: 'venue_id' })
  venue: Venue;

  @OneToMany(() => Vendor, (vendor) => vendor.event)
  vendors: Vendor[];

  @OneToMany(() => Category, (category) => category.event)
  categories: Category[];

  @OneToMany(() => ScheduleItem, (item) => item.event)
  scheduleItems: ScheduleItem[];

  @OneToMany(() => Announcement, (announcement) => announcement.event)
  announcements: Announcement[];

  @OneToMany(() => VenueMap, (map) => map.event)
  venueMaps: VenueMap[];
}
