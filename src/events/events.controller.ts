import { Controller, Get, Param, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventStatus } from '../common/enums';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll(
    @Query('status') status?: EventStatus,
    @Query('near') near?: string,
  ) {
    return this.eventsService.findAll(status, near);
  }

  @Get(':eventId')
  findOne(@Param('eventId') eventId: string) {
    return this.eventsService.findOne(eventId);
  }

  @Get(':eventId/schedule')
  getSchedule(@Param('eventId') eventId: string) {
    return this.eventsService.getSchedule(eventId);
  }

  @Get(':eventId/categories')
  getCategories(@Param('eventId') eventId: string) {
    return this.eventsService.getCategories(eventId);
  }

  @Get(':eventId/map')
  getMap(@Param('eventId') eventId: string) {
    return this.eventsService.getMap(eventId);
  }
}
