import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Event } from './event.entity';
import { Category } from './category.entity';
import { Product } from './product.entity';
import { Promotion } from './promotion.entity';
import { Review } from './review.entity';
import { Favorite } from './favorite.entity';
import { VendorReminder } from './vendor-reminder.entity';

@Entity('vendors')
@Index(['eventId', 'isActive'])
export class Vendor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 220 })
  slug: string;

  @Column({ name: 'category_id', type: 'uuid', nullable: true })
  categoryId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'booth_number', type: 'varchar', length: 50, nullable: true })
  boothNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  zone: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'text', nullable: true })
  website: string | null;

  @Column({ name: 'logo_url', type: 'text', nullable: true })
  logoUrl: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  latitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  longitude: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'qr_code_payload', type: 'text', nullable: true })
  qrCodePayload: string | null;

  @Column({ name: 'avg_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  avgRating: number;

  @Column({ name: 'review_count', type: 'int', default: 0 })
  reviewCount: number;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount: number;

  @Column({ name: 'created_by_id', type: 'uuid', nullable: true })
  createdById: string | null;

  @Column({ name: 'updated_by_id', type: 'uuid', nullable: true })
  updatedById: string | null;

  @Column({ name: 'deactivated_by_id', type: 'uuid', nullable: true })
  deactivatedById: string | null;

  @Column({ name: 'deactivated_at', nullable: true })
  deactivatedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Event, (event) => event.vendors)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @ManyToOne(() => Category, (category) => category.vendors, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @OneToMany(() => Product, (product) => product.vendor)
  products: Product[];

  @OneToMany(() => Promotion, (promotion) => promotion.vendor)
  promotions: Promotion[];

  @OneToMany(() => Review, (review) => review.vendor)
  reviews: Review[];

  @OneToMany(() => Favorite, (favorite) => favorite.vendor)
  favorites: Favorite[];

  @OneToMany(() => VendorReminder, (reminder) => reminder.vendor)
  reminders: VendorReminder[];
}
