import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('performance_events')
@Index(['eventId', 'createdAt'])
@Index(['kind', 'createdAt'])
export class PerformanceEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'event_id', type: 'uuid', nullable: true })
  eventId: string | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ type: 'varchar', length: 40 })
  kind: string;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'duration_ms', type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ type: 'simple-json', nullable: true })
  properties: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
