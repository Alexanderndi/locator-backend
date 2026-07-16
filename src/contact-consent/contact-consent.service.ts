import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactConsentRequest } from '../entities/contact-consent-request.entity';
import { Favorite } from '../entities/favorite.entity';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { User } from '../entities/user.entity';
import { Vendor } from '../entities/vendor.entity';
import {
  AnalyticsEventType,
  ContactConsentStatus,
  UserRole,
} from '../common/enums';
import { EventsService } from '../events/events.service';
import { VendorsService } from '../vendors/vendors.service';
import {
  CreateContactConsentDto,
  RespondContactConsentDto,
} from './dto/contact-consent.dto';

const CONSENT_EXPIRY_DAYS = 30;

@Injectable()
export class ContactConsentService {
  constructor(
    @InjectRepository(ContactConsentRequest)
    private readonly consentRepository: Repository<ContactConsentRequest>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsRepository: Repository<AnalyticsEvent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly eventsService: EventsService,
    private readonly vendorsService: VendorsService,
  ) {}

  async createRequest(vendorId: string, dto: CreateContactConsentDto) {
    await this.eventsService.ensureEvent(dto.eventId);
    const vendor = await this.vendorsService.ensureVendor(vendorId);

    if (vendor.eventId !== dto.eventId) {
      throw new BadRequestException('Vendor does not belong to this event');
    }

    const visitor = await this.resolveVisitor(dto);
    if (visitor.role !== UserRole.VISITOR) {
      throw new BadRequestException(
        'Contact consent requests can only be sent to visitors',
      );
    }

    await this.ensureVisitorEngaged(visitor.id, vendorId);
    await this.expireStaleRequests(visitor.id);

    const existingPending = await this.consentRepository.findOne({
      where: {
        vendorId,
        userId: visitor.id,
        status: ContactConsentStatus.PENDING,
      },
    });
    if (existingPending) {
      throw new ConflictException(
        'A pending contact consent request already exists for this visitor',
      );
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + CONSENT_EXPIRY_DAYS);

    const saved = await this.consentRepository.save(
      this.consentRepository.create({
        vendorId,
        userId: visitor.id,
        eventId: dto.eventId,
        status: ContactConsentStatus.PENDING,
        requestedAt: now,
        expiresAt,
      }),
    );

    const request = await this.consentRepository.findOne({
      where: { id: saved.id },
      relations: ['vendor', 'user'],
    });

    return this.formatRequest(request!, 'vendor');
  }

  async listForVendor(vendorId: string) {
    await this.vendorsService.ensureVendor(vendorId);
    await this.expireAllStaleForVendor(vendorId);

    const requests = await this.consentRepository.find({
      where: { vendorId },
      relations: ['user', 'vendor'],
      order: { requestedAt: 'DESC' },
    });

    return {
      data: requests.map((r) => this.formatRequest(r, 'vendor')),
    };
  }

  async listForVisitor(userId: string) {
    await this.expireStaleRequests(userId);

    const requests = await this.consentRepository.find({
      where: { userId },
      relations: ['vendor'],
      order: { requestedAt: 'DESC' },
    });

    return {
      data: requests.map((r) => this.formatRequest(r, 'visitor')),
    };
  }

  async respond(
    userId: string,
    requestId: string,
    dto: RespondContactConsentDto,
  ) {
    const request = await this.consentRepository.findOne({
      where: { id: requestId, userId },
      relations: ['vendor', 'user'],
    });

    if (!request) {
      throw new NotFoundException('Contact consent request not found');
    }

    await this.expireIfNeeded(request);

    if (request.status !== ContactConsentStatus.PENDING) {
      throw new ConflictException('This request has already been responded to');
    }

    const now = new Date();

    if (dto.action === 'accept') {
      const visitor = request.user;
      request.status = ContactConsentStatus.ACCEPTED;
      request.respondedAt = now;
      request.sharedEmail = visitor.email;
      request.sharedPhone = visitor.phone;
    } else {
      request.status = ContactConsentStatus.DECLINED;
      request.respondedAt = now;
      request.sharedEmail = null;
      request.sharedPhone = null;
    }

    await this.consentRepository.save(request);

    return this.formatRequest(request, 'visitor', true);
  }

  async getInboxItems(userId: string) {
    await this.expireStaleRequests(userId);

    const pending = await this.consentRepository.find({
      where: { userId, status: ContactConsentStatus.PENDING },
      relations: ['vendor'],
      order: { requestedAt: 'DESC' },
    });

    return pending.map((r) => ({
      id: `consent-${r.id}`,
      type: 'contact_consent',
      title: `${r.vendor.name} wants to contact you`,
      body: 'This vendor is requesting permission to reach you after the event. Accept to share your contact details, or decline to keep them private.',
      eventId: r.eventId,
      read: false,
      createdAt: r.requestedAt,
      data: {
        requestId: r.id,
        vendorId: r.vendorId,
        vendorName: r.vendor.name,
        status: r.status,
      },
    }));
  }

  private async resolveVisitor(dto: CreateContactConsentDto): Promise<User> {
    if (!dto.userId && !dto.userEmail) {
      throw new BadRequestException('userId or userEmail is required');
    }

    let visitor: User | null = null;
    if (dto.userId) {
      visitor = await this.userRepository.findOne({
        where: { id: dto.userId },
      });
    } else if (dto.userEmail) {
      visitor = await this.userRepository.findOne({
        where: { email: dto.userEmail.toLowerCase() },
      });
    }

    if (!visitor) {
      throw new NotFoundException('Visitor not found');
    }

    return visitor;
  }

  private async ensureVisitorEngaged(userId: string, vendorId: string) {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, vendorId },
    });
    if (favorite) return;

    const qrScans = await this.analyticsRepository.find({
      where: { userId, type: AnalyticsEventType.QR_SCAN },
    });
    const hasQrEngagement = qrScans.some(
      (e) => e.properties?.vendorId === vendorId,
    );
    if (hasQrEngagement) return;

    throw new ForbiddenException(
      'Visitor must have favorited this vendor or scanned their booth QR code',
    );
  }

  private async expireStaleRequests(userId: string) {
    const pending = await this.consentRepository.find({
      where: { userId, status: ContactConsentStatus.PENDING },
    });
    for (const request of pending) {
      await this.expireIfNeeded(request);
    }
  }

  private async expireAllStaleForVendor(vendorId: string) {
    const pending = await this.consentRepository.find({
      where: { vendorId, status: ContactConsentStatus.PENDING },
    });
    for (const request of pending) {
      await this.expireIfNeeded(request);
    }
  }

  private async expireIfNeeded(request: ContactConsentRequest) {
    if (
      request.status === ContactConsentStatus.PENDING &&
      request.expiresAt &&
      request.expiresAt < new Date()
    ) {
      request.status = ContactConsentStatus.EXPIRED;
      await this.consentRepository.save(request);
    }
  }

  private formatRequest(
    request: ContactConsentRequest,
    perspective: 'vendor' | 'visitor',
    includeMessage = false,
  ) {
    const base = {
      id: request.id,
      vendorId: request.vendorId,
      userId: request.userId,
      eventId: request.eventId,
      status: request.status,
      requestedAt: request.requestedAt,
      respondedAt: request.respondedAt,
      expiresAt: request.expiresAt,
      vendor: request.vendor
        ? {
            id: request.vendor.id,
            name: request.vendor.name,
            boothNumber: request.vendor.boothNumber,
          }
        : undefined,
      visitor: request.user
        ? {
            id: request.user.id,
            displayName: request.user.displayName,
          }
        : undefined,
    };

    if (perspective === 'vendor') {
      if (request.status === ContactConsentStatus.ACCEPTED) {
        return {
          ...base,
          sharedEmail: request.sharedEmail,
          sharedPhone: request.sharedPhone,
        };
      }
      return base;
    }

    const result: Record<string, unknown> = { ...base };
    if (includeMessage) {
      result.message =
        request.status === ContactConsentStatus.ACCEPTED
          ? 'Your contact details have been shared with this vendor.'
          : 'No contact details were shared with this vendor.';
    }
    return result;
  }
}
