import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from '../entities/event.entity';
import { VenueMap } from '../entities/venue-map.entity';
import { ScheduleItem } from '../entities/schedule-item.entity';
import { Category } from '../entities/category.entity';
import { Vendor } from '../entities/vendor.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Event, VenueMap, ScheduleItem, Category, Vendor]),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
