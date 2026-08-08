import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Vendor } from './vendor.entity';
import { Event } from './event.entity';
import { Message } from './message.entity';
import { ConversationRead } from './conversation-read.entity';

@Entity('conversations')
@Unique(['visitorId', 'vendorId', 'eventId'])
@Index(['eventId', 'lastMessageAt'])
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @Column({ name: 'visitor_id', type: 'uuid' })
  visitorId: string;

  @Column({
    name: 'last_message_preview',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  lastMessagePreview: string | null;

  @Column({ name: 'last_message_at', type: Date, nullable: true })
  lastMessageAt: Date | null;

  @Column({
    name: 'last_message_sender_role',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  lastMessageSenderRole: string | null;

  @Column({ name: 'visitor_deleted_at', type: Date, nullable: true })
  visitorDeletedAt: Date | null;

  @Column({ name: 'vendor_deleted_at', type: Date, nullable: true })
  vendorDeletedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Event)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @ManyToOne(() => Vendor)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'visitor_id' })
  visitor: User;

  @OneToMany(() => Message, (message) => message.conversation)
  messages: Message[];

  @OneToMany(() => ConversationRead, (read) => read.conversation)
  reads: ConversationRead[];
}
