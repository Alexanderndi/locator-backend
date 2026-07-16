import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserRole } from '../common/enums';
import { Vendor } from './vendor.entity';
import { RefreshToken } from './refresh-token.entity';
import { Favorite } from './favorite.entity';
import { UserPreference } from './user-preference.entity';
import { DeviceToken } from './device-token.entity';
import { VendorReminder } from './vendor-reminder.entity';
import { Review } from './review.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 20, unique: true, nullable: true })
  phone: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @Column({ name: 'avatar_url', type: 'text', nullable: true })
  avatarUrl: string | null;

  @Column({ type: 'varchar', length: 20, default: UserRole.VISITOR })
  role: UserRole;

  @Column({ name: 'vendor_id', type: 'uuid', nullable: true })
  vendorId: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => Favorite, (favorite) => favorite.user)
  favorites: Favorite[];

  @OneToOne(() => UserPreference, (pref) => pref.user)
  preferences: UserPreference;

  @OneToMany(() => DeviceToken, (token) => token.user)
  deviceTokens: DeviceToken[];

  @OneToMany(() => VendorReminder, (reminder) => reminder.user)
  reminders: VendorReminder[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @ManyToOne(() => Vendor, { nullable: true })
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor | null;
}
