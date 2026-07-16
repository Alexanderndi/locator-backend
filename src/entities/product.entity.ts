import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  name: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price: number | null;

  @Column({ name: 'max_price', type: 'decimal', precision: 12, scale: 2, nullable: true })
  maxPrice: number | null;

  @Column({ type: 'varchar', length: 3, default: 'NGN' })
  currency: string;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl: string | null;

  @Column({ name: 'mime_type', type: 'varchar', length: 100, nullable: true })
  mimeType: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_available', type: 'boolean', default: true })
  isAvailable: boolean;

  @ManyToOne(() => Vendor, (vendor) => vendor.products)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;
}
