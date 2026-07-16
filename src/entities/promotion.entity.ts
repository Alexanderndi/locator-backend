import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Vendor } from './vendor.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'vendor_id', type: 'uuid' })
  vendorId: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({
    name: 'discount_percent',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  discountPercent: number | null;

  @Column({ name: 'start_date', type: Date, nullable: true })
  startDate: Date | null;

  @Column({ name: 'end_date', type: Date, nullable: true })
  endDate: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Vendor, (vendor) => vendor.promotions)
  @JoinColumn({ name: 'vendor_id' })
  vendor: Vendor;
}
