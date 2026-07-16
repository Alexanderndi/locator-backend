import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Event } from './event.entity';
import { Vendor } from './vendor.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId: string;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  icon: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @ManyToOne(() => Event, (event) => event.categories)
  @JoinColumn({ name: 'event_id' })
  event: Event;

  @OneToMany(() => Vendor, (vendor) => vendor.category)
  vendors: Vendor[];
}
