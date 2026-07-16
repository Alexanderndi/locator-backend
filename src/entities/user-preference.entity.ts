import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_preferences')
export class UserPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  userId: string;

  @Column({ name: 'push_enabled', type: 'boolean', default: true })
  pushEnabled: boolean;

  @Column({ name: 'email_enabled', type: 'boolean', default: true })
  emailEnabled: boolean;

  @Column({ name: 'favorite_categories', type: 'simple-json', nullable: true })
  favoriteCategories: string[] | null;

  @Column({ name: 'read_notification_ids', type: 'simple-json', default: '[]' })
  readNotificationIds: string[];

  @OneToOne(() => User, (user) => user.preferences)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
