import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../entities/vendor.entity';
import { EventsService } from '../events/events.service';
import {
  haversineDistanceMeters,
  generateRoutePoints,
  generateTurnByTurnSteps,
  isInsideBounds,
  snapToNearestBoundary,
  VenueBounds,
} from '../common/utils/geo.util';
import { verifyQrSignature } from '../common/utils/qr.util';
import { RouteRequestDto } from './dto/maps.dto';

@Injectable()
export class MapsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly eventsService: EventsService,
    private readonly configService: ConfigService,
  ) {}

  async computeRoute(eventId: string, dto: RouteRequestDto) {
    const event = await this.eventsService.ensureEvent(eventId);
    const vendor = await this.vendorRepository.findOne({
      where: { id: dto.toVendorId, eventId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found for this event');
    }

    const toLat = Number(vendor.latitude);
    const toLng = Number(vendor.longitude);
    if (
      Number.isNaN(toLat) ||
      Number.isNaN(toLng) ||
      (toLat === 0 && toLng === 0)
    ) {
      throw new BadRequestException(
        'This booth location is not available for navigation',
      );
    }

    const venue = event.venue;
    const bounds: VenueBounds | null = venue
      ? {
          north: Number(venue.boundaryNorth ?? venue.latitude),
          south: Number(venue.boundarySouth ?? venue.latitude),
          east: Number(venue.boundaryEast ?? venue.longitude),
          west: Number(venue.boundaryWest ?? venue.longitude),
        }
      : null;

    if (bounds && !isInsideBounds(toLat, toLng, bounds)) {
      throw new BadRequestException(
        'This booth is outside the event map and cannot be reached on foot',
      );
    }

    let fromLat = dto.lat;
    let fromLng = dto.lng;
    let snappedFromEntry = false;
    let entryNote: string | null = null;

    if (bounds && !isInsideBounds(fromLat, fromLng, bounds)) {
      const snapped = snapToNearestBoundary(fromLat, fromLng, bounds);
      fromLat = snapped.lat;
      fromLng = snapped.lng;
      snappedFromEntry = snapped.snapped;
      entryNote =
        'Your location is outside the venue. The route starts from the nearest entrance.';
    }

    const distance = haversineDistanceMeters(fromLat, fromLng, toLat, toLng);
    const walkingSpeedMps = 1.4;
    const durationSeconds = Math.round(distance / walkingSpeedMps);
    const pointCount = Math.min(
      24,
      Math.max(5, Math.floor(distance / 20)),
    );
    const points = generateRoutePoints(
      fromLat,
      fromLng,
      toLat,
      toLng,
      pointCount,
    );
    const steps = generateTurnByTurnSteps(
      fromLat,
      fromLng,
      toLat,
      toLng,
      vendor.name,
      vendor.boothNumber,
    );

    if (snappedFromEntry) {
      steps.unshift({
        instruction: entryNote ?? 'Walk to the nearest venue entrance',
        distance: Math.round(
          haversineDistanceMeters(dto.lat, dto.lng, fromLat, fromLng),
        ),
        duration: Math.round(
          haversineDistanceMeters(dto.lat, dto.lng, fromLat, fromLng) /
            walkingSpeedMps,
        ),
      });
    }

    return {
      from: { lat: fromLat, lng: fromLng },
      originalFrom: snappedFromEntry ? { lat: dto.lat, lng: dto.lng } : null,
      to: {
        vendorId: vendor.id,
        name: vendor.name,
        lat: toLat,
        lng: toLng,
        boothNumber: vendor.boothNumber,
      },
      distance: Math.round(distance),
      duration: durationSeconds,
      polyline: points,
      steps,
      routeType: 'straight_line',
      disclaimer:
        'Walking route is approximate. Follow venue walkways and signage.',
      snappedFromEntry,
      entryNote,
      reachable: true,
    };
  }

  async validateQr(eventId: string, vendorId: string, sig?: string) {
    await this.eventsService.ensureEvent(eventId);
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId, eventId },
      relations: ['category'],
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
    if (!sig) {
      throw new BadRequestException('Missing signature parameter');
    }

    const secret = this.configService.get<string>('qr.hmacSecret') ?? '';
    const valid = verifyQrSignature(eventId, vendorId, sig, secret);

    return {
      valid,
      vendor: valid
        ? {
            id: vendor.id,
            name: vendor.name,
            boothNumber: vendor.boothNumber,
            category: vendor.category?.name ?? null,
          }
        : null,
      qrCodePayload: vendor.qrCodePayload,
    };
  }
}
