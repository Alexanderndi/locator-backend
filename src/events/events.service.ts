import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';
import { VenueMap } from '../entities/venue-map.entity';
import { ScheduleItem } from '../entities/schedule-item.entity';
import { Category } from '../entities/category.entity';
import { Vendor } from '../entities/vendor.entity';
import { EventStatus } from '../common/enums';
import { computeEntryPoints } from '../common/utils/geo.util';
import { haversineDistanceMeters, parseNearParam } from '../common/utils/geo.util';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(VenueMap)
    private readonly venueMapRepository: Repository<VenueMap>,
    @InjectRepository(ScheduleItem)
    private readonly scheduleRepository: Repository<ScheduleItem>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async findAll(status?: EventStatus, near?: string) {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('event.organization', 'organization');

    if (status) {
      qb.andWhere('event.status = :status', { status });
    } else {
      qb.andWhere('event.status IN (:...statuses)', {
        statuses: [EventStatus.PUBLISHED, EventStatus.ACTIVE],
      });
    }

    qb.andWhere('event.end_date >= :now', { now: new Date().toISOString().slice(0, 10) });

    let events = await qb.getMany();
    const nearPoint = parseNearParam(near);

    if (nearPoint) {
      const withDistance = events
        .map((event) => ({
          event,
          distance: event.venue
            ? haversineDistanceMeters(
                nearPoint.lat,
                nearPoint.lng,
                Number(event.venue.latitude),
                Number(event.venue.longitude),
              )
            : Infinity,
        }))
        .sort((a, b) => a.distance - b.distance)
        .map(({ event, distance }) => ({
          ...this.formatEvent(event),
          distanceMeters: distance === Infinity ? null : Math.round(distance),
        }));
      return { data: withDistance };
    }

    return { data: events.map((e) => this.formatEvent(e)) };
  }

  async findOne(eventId: string) {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['venue', 'organization'],
    });
    if (!event) throw new NotFoundException('Event not found');
    return this.formatEvent(event, true);
  }

  async getSchedule(eventId: string) {
    const event = await this.ensureEvent(eventId);
    const items = await this.scheduleRepository.find({
      where: { eventId },
      order: { startTime: 'ASC' },
    });

    const byDay: Record<string, typeof items> = {};
    for (const item of items) {
      const day = item.dayLabel ?? item.startTime.toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(item);
    }

    const schedule = Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, dayItems]) => ({
        day,
        items: dayItems.map((i) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          startTime: i.startTime,
          endTime: i.endTime,
          location: i.location,
        })),
      }));

    return {
      eventId,
      timezone: event.timezone,
      schedule,
    };
  }

  async getCategories(eventId: string) {
    await this.ensureEvent(eventId);
    const categories = await this.categoryRepository.find({
      where: { eventId },
      order: { sortOrder: 'ASC' },
    });

    const counts = await this.vendorRepository
      .createQueryBuilder('vendor')
      .select('vendor.category_id', 'categoryId')
      .addSelect('COUNT(*)', 'count')
      .where('vendor.event_id = :eventId', { eventId })
      .andWhere('vendor.is_active = 1')
      .groupBy('vendor.category_id')
      .getRawMany<{ categoryId: string; count: string }>();

    const countMap = new Map(
      counts.map((c) => [c.categoryId, parseInt(c.count, 10)]),
    );

    return {
      data: categories.map((c) => ({
        id: c.id,
        name: c.name,
        icon: c.icon,
        vendorCount: countMap.get(c.id) ?? 0,
      })),
    };
  }

  async getMap(eventId: string) {
    const event = await this.ensureEvent(eventId);
    const venueMap = await this.venueMapRepository.findOne({
      where: { eventId },
    });
    const venue = event.venue;

    const bounds = venue
      ? {
          north: Number(venue.boundaryNorth ?? venue.latitude),
          south: Number(venue.boundarySouth ?? venue.latitude),
          east: Number(venue.boundaryEast ?? venue.longitude),
          west: Number(venue.boundaryWest ?? venue.longitude),
        }
      : null;

    const floorPlanUrl = venueMap?.floorPlanUrl ?? null;
    const tileUrlTemplate = venueMap?.tileUrlTemplate ?? null;

    return {
      eventId,
      bounds,
      center: venueMap
        ? {
            lat: Number(venueMap.centerLat ?? venue?.latitude ?? 0),
            lng: Number(venueMap.centerLng ?? venue?.longitude ?? 0),
          }
        : venue
          ? { lat: Number(venue.latitude), lng: Number(venue.longitude) }
          : null,
      floorPlanUrl,
      tileUrlTemplate,
      hasInteractiveMap: Boolean(floorPlanUrl || tileUrlTemplate),
      venue: venue
        ? {
            id: venue.id,
            name: venue.name,
            address: venue.address,
          }
        : null,
      entryPoints: bounds ? computeEntryPoints(bounds) : [],
    };
  }

  private formatEvent(event: Event, detailed = false) {
    const base = {
      id: event.id,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone,
      status: event.status,
      coverImageUrl: event.coverImageUrl,
      venue: event.venue
        ? {
            id: event.venue.id,
            name: event.venue.name,
            address: event.venue.address,
            latitude: Number(event.venue.latitude),
            longitude: Number(event.venue.longitude),
            boundaryNorth: event.venue.boundaryNorth
              ? Number(event.venue.boundaryNorth)
              : null,
            boundarySouth: event.venue.boundarySouth
              ? Number(event.venue.boundarySouth)
              : null,
            boundaryEast: event.venue.boundaryEast
              ? Number(event.venue.boundaryEast)
              : null,
            boundaryWest: event.venue.boundaryWest
              ? Number(event.venue.boundaryWest)
              : null,
          }
        : null,
    };
    if (detailed) {
      return {
        ...base,
        organization: event.organization
          ? { id: event.organization.id, name: event.organization.name }
          : null,
      };
    }
    return base;
  }

  async ensureEvent(eventId: string): Promise<Event> {
    const event = await this.eventRepository.findOne({
      where: { id: eventId },
      relations: ['venue'],
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
}
