import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ContactConsentStatus } from '../common/enums';
import { User } from './user.entity';
import { Vendor } from './vendor.entity';
import { Event } from './event.entity';

@Entity('contact_consent_requests')
export class ContactConsentRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ContactConsentStatus.PENDING,
  })
  status: ContactConsentStatus;

  @Column({
    name: 'shared_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  sharedEmail: string | null;

  @Column({ name: 'shared_phone', type: 'varchar', length: 20, nullable: true })
  sharedPhone: string | null;

  @Column({ name: 'requested_at', type: Date })
  requestedAt: Date;

  @Column({ name: 'responded_at', type: Date, nullable: true })
  respondedAt: Date | null;

  @Column({ name: 'expires_at', type: Date, nullable: true })
  expiresAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
  event: Event;
}
