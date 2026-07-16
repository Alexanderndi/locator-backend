import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Vendor } from './vendor.entity';
import { Event } from './event.entity';

@Entity('vendor_reminders')
export class VendorReminder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'scheduled_at', type: 'datetime' })
  scheduledAt: Date;

  @Column({ type: 'text', nullable: true })
  message: string | null;

  @Column({ name: 'is_sent', type: 'boolean', default: false })
  isSent: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.reminders)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Vendor, (vendor) => vendor.reminders)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
