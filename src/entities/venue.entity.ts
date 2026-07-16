import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Event } from './event.entity';

@Entity('venues')
export class Venue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  address: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ name: 'boundary_north', type: 'decimal', precision: 10, scale: 7, nullable: true })
  boundaryNorth: number | null;

  @Column({ name: 'boundary_south', type: 'decimal', precision: 10, scale: 7, nullable: true })
  boundarySouth: number | null;

  @Column({ name: 'boundary_east', type: 'decimal', precision: 10, scale: 7, nullable: true })
  boundaryEast: number | null;

  @Column({ name: 'boundary_west', type: 'decimal', precision: 10, scale: 7, nullable: true })
  boundaryWest: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Event, (event) => event.venue)
  events: Event[];
}
