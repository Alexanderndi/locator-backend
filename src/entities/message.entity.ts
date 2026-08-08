import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { MessageType, ChatSenderRole } from '../common/enums';
import { Conversation } from './conversation.entity';
import { User } from './user.entity';

@Entity('messages')
@Index(['conversationId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'conversation_id', type: 'uuid' })
  conversationId: string;

  @Column({ name: 'sender_id', type: 'uuid' })
  senderId: string;

  @Column({ name: 'sender_role', type: 'varchar', length: 20 })
  senderRole: ChatSenderRole;

  @Column({ type: 'varchar', length: 20, default: MessageType.TEXT })
  type: MessageType;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @Column({ name: 'media_url', type: 'text', nullable: true })
  mediaUrl: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => Conversation, (conversation) => conversation.messages)
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'sender_id' })
  sender: User;
}
