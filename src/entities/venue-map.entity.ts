import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('venue_maps')
export class VenueMap {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'tile_url_template', type: 'text', nullable: true })
  tileUrlTemplate: string | null;

  @Column({ name: 'floor_plan_url', type: 'text', nullable: true })
  floorPlanUrl: string | null;

  @Column({ name: 'center_lat', type: 'decimal', precision: 10, scale: 7, nullable: true })
  centerLat: number | null;

  @Column({ name: 'center_lng', type: 'decimal', precision: 10, scale: 7, nullable: true })
  centerLng: number | null;

  @ManyToOne(() => Event, (event) => event.venueMaps)
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
