import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { User } from './user.entity';
import { Vendor } from './vendor.entity';
import { Event } from './event.entity';

@Entity('favorites')
@Unique(['userId', 'vendorId'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.favorites)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Vendor, (vendor) => vendor.favorites)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
