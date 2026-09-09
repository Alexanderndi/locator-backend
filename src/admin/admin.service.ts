import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { Vendor } from '../entities/vendor.entity';
import { Product } from '../entities/product.entity';
import { Promotion } from '../entities/promotion.entity';
import { Announcement } from '../entities/announcement.entity';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';
import { Event } from '../entities/event.entity';
import { Category } from '../entities/category.entity';
import { User } from '../entities/user.entity';
import { Organization } from '../entities/organization.entity';
import { Venue } from '../entities/venue.entity';
import { EventsService } from '../events/events.service';
import { AnalyticsService } from '../analytics/analytics.service';
import { buildQrPayload } from '../common/utils/qr.util';
import {
  CreateVendorDto,
  UpdateVendorDto,
  BulkImportVendorsDto,
  BulkImportVendorRowDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  CreateContactConsentAdminDto,
  CreateOrganizationDto,
  CreateOrganizationAdminDto,
  CreateEventDto,
  UpdateEventDto,
} from './dto/admin.dto';
import { AnnouncementPriority, EventStatus, UserRole } from '../common/enums';
import { PushDeliveryService } from '../notifications/push-delivery.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ContactConsentService } from '../contact-consent/contact-consent.service';
import { assertUniqueBooth } from '../common/utils/booth.util';
import { buildVendorQrPdf } from './qr-pdf.service';
import { buildDashboardPdf } from './dashboard-pdf.service';
import { MediaService } from '../media/media.service';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    @InjectRepository(AnalyticsEvent)
    private readonly analyticsRepository: Repository<AnalyticsEvent>,
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepository: Repository<AdminAuditLog>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    private readonly eventsService: EventsService,
    private readonly analyticsService: AnalyticsService,
    private readonly configService: ConfigService,
    private readonly contactConsentService: ContactConsentService,
    private readonly pushDeliveryService: PushDeliveryService,
    private readonly notificationsService: NotificationsService,
    private readonly mediaService: MediaService,
  ) {}

  async listOrganizations(user: User) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    const orgs = await this.organizationRepository.find({
      order: { createdAt: 'DESC' },
    });

    // Portable across SQLite/Postgres.
    const counts = await this.eventRepository
      .createQueryBuilder('event')
      .select('event.organization_id', 'organizationId')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.organization_id')
      .getRawMany<{ organizationId: string; count: string }>();

    const countByOrg = new Map(
      counts.map((row) => [row.organizationId, Number(row.count)]),
    );

    return {
      data: orgs.map((org) => ({
        id: org.id,
        name: org.name,
        description: org.description,
        contactEmail: org.contactEmail,
        createdAt: org.createdAt.toISOString(),
        eventCount: countByOrg.get(org.id) ?? 0,
      })),
    };
  }

  async createOrganization(dto: CreateOrganizationDto, user: User) {
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Super admin access required');
    }

    const org = await this.organizationRepository.save(
      this.organizationRepository.create({
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        contactEmail: dto.contactEmail?.toLowerCase().trim() || null,
      }),
    );

    return {
      id: org.id,
      name: org.name,
      description: org.description,
      contactEmail: org.contactEmail,
      createdAt: org.createdAt.toISOString(),
    };
  }

  async listOrganizationAdmins(organizationId: string, user: User) {
    this.assertOrganizationAccess(user, organizationId);

    const admins = await this.userRepository.find({
      where: {
        role: UserRole.ORGANIZER,
        organizationId,
        deletedAt: IsNull(),
      },
      order: { createdAt: 'DESC' },
    });

    return {
      data: admins.map((u) => ({
        id: u.id,
        email: u.email,
        displayName: u.displayName,
        organizationId: u.organizationId,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  }

  async createOrganizationAdmin(
    organizationId: string,
    dto: CreateOrganizationAdminDto,
    user: User,
  ) {
    this.assertOrganizationAccess(user, organizationId);

    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    const email = dto.email.toLowerCase().trim();
    const existing = await this.userRepository.findOne({
      where: { email, deletedAt: IsNull() },
    });
    if (existing) {
      throw new BadRequestException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const created = await this.userRepository.save(
      this.userRepository.create({
        email,
        passwordHash,
        displayName: dto.displayName.trim(),
        role: UserRole.ORGANIZER,
        organizationId,
      }),
    );

    // Note: we intentionally do NOT write to AdminAuditLog here because that table
    // requires a real eventId UUID (Postgres uuid column). We'll add org-level auditing later.
    return {
      id: created.id,
      email: created.email,
      displayName: created.displayName,
      role: created.role,
      organizationId: created.organizationId,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async createEvent(dto: CreateEventDto, user: User) {
    let organizationId = dto.organizationId;

    if (user.role === UserRole.ORGANIZER) {
      if (!user.organizationId) {
        throw new ForbiddenException('Organizer organization not configured');
      }
      organizationId = user.organizationId;
    }

    if (user.role === UserRole.ADMIN) {
      if (!organizationId) {
        throw new BadRequestException('organizationId is required');
      }
    }

    if (!organizationId) {
      throw new BadRequestException('organizationId is required');
    }

    const org = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!org) throw new NotFoundException('Organization not found');

    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    const event = await this.eventRepository.save(
      this.eventRepository.create({
        organizationId,
        venueId: dto.venueId ?? null,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        startDate: dto.startDate,
        endDate: dto.endDate,
        timezone: dto.timezone?.trim() || 'Africa/Lagos',
        status: dto.status ?? EventStatus.DRAFT,
        coverImageUrl: dto.coverImageUrl?.trim() || null,
      }),
    );

    await this.recordAudit({
      eventId: event.id,
      entityType: 'event',
      entityId: event.id,
      action: 'create',
      user,
      metadata: { organizationId },
    });

    return {
      id: event.id,
      organizationId: event.organizationId,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone,
      status: event.status,
      venueId: event.venueId,
      coverImageUrl: event.coverImageUrl,
      createdAt: event.createdAt.toISOString(),
    };
  }

  async uploadEventCover(
    eventId: string,
    file: Express.Multer.File,
    user: User,
  ) {
    const event = await this.assertEventAccess(user, eventId);
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const previous = event.coverImageUrl;
    const saved = this.mediaService.saveEventCoverImage(file);
    event.coverImageUrl = saved.imageUrl;
    await this.eventRepository.save(event);

    // Best effort cleanup (local uploads only).
    this.mediaService.deleteEventCoverImage(previous);

    await this.recordAudit({
      eventId,
      entityType: 'event',
      entityId: eventId,
      action: 'update_banner',
      user,
      metadata: {
        previous,
        next: event.coverImageUrl,
      },
    });

    return {
      coverImageUrl: event.coverImageUrl,
      coverImagePublicUrl: this.mediaService.toPublicUrl(event.coverImageUrl),
    };
  }

  async updateEvent(eventId: string, dto: UpdateEventDto, user: User) {
    const event = await this.assertEventAccess(user, eventId);
    const changes: Record<string, unknown> = {};

    if (dto.name !== undefined) {
      event.name = dto.name.trim();
      changes.name = event.name;
    }
    if (dto.description !== undefined) {
      event.description = dto.description ? dto.description.trim() : null;
      changes.description = event.description;
    }
    if (dto.startDate !== undefined) {
      event.startDate = dto.startDate;
      changes.startDate = event.startDate;
    }
    if (dto.endDate !== undefined) {
      event.endDate = dto.endDate;
      changes.endDate = event.endDate;
    }
    if (dto.timezone !== undefined) {
      event.timezone = dto.timezone.trim();
      changes.timezone = event.timezone;
    }
    if (dto.status !== undefined) {
      event.status = dto.status;
      changes.status = event.status;
    }
    if (dto.venueId !== undefined) {
      event.venueId = dto.venueId ?? null;
      changes.venueId = event.venueId;
    }
    if (dto.coverImageUrl !== undefined) {
      event.coverImageUrl = dto.coverImageUrl ? dto.coverImageUrl.trim() : null;
      changes.coverImageUrl = event.coverImageUrl;
    }

    if (event.startDate > event.endDate) {
      throw new BadRequestException('startDate must be on or before endDate');
    }

    await this.eventRepository.save(event);
    await this.recordAudit({
      eventId,
      entityType: 'event',
      entityId: eventId,
      action: 'update',
      user,
      metadata: { changes },
    });

    return {
      id: event.id,
      organizationId: event.organizationId,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone,
      status: event.status,
      venueId: event.venueId,
      coverImageUrl: event.coverImageUrl,
      createdAt: event.createdAt.toISOString(),
    };
  }

  private resolveVenueBounds(venue: Venue | null | undefined) {
    if (!venue) return null;
    if (
      venue.boundaryNorth == null ||
      venue.boundarySouth == null ||
      venue.boundaryEast == null ||
      venue.boundaryWest == null
    ) {
      return null;
    }

    const north = Math.max(
      Number(venue.boundaryNorth),
      Number(venue.boundarySouth),
    );
    const south = Math.min(
      Number(venue.boundaryNorth),
      Number(venue.boundarySouth),
    );
    const east = Math.max(
      Number(venue.boundaryEast),
      Number(venue.boundaryWest),
    );
    const west = Math.min(
      Number(venue.boundaryEast),
      Number(venue.boundaryWest),
    );

    return { north, south, east, west };
  }

  private assertWithinBounds(
    bounds: { north: number; south: number; east: number; west: number },
    latitude: number,
    longitude: number,
  ) {
    if (
      latitude < bounds.south ||
      latitude > bounds.north ||
      longitude < bounds.west ||
      longitude > bounds.east
    ) {
      throw new BadRequestException(
        `Booth location must be within the event boundary. Received (${latitude}, ${longitude}).`,
      );
    }
  }

  async getEventDetails(eventId: string, user: User) {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('event.organization', 'organization')
      .where('event.id = :eventId', { eventId });

    if (user.role === UserRole.ORGANIZER) {
      if (!user.organizationId) {
        throw new ForbiddenException('Organization access required');
      }
      qb.andWhere('event.organization_id = :orgId', {
        orgId: user.organizationId,
      });
    }

    const event = await qb.getOne();
    if (!event) throw new NotFoundException('Event not found');

    return {
      id: event.id,
      organizationId: event.organizationId,
      organizationName: event.organization?.name ?? null,
      name: event.name,
      description: event.description,
      startDate: event.startDate,
      endDate: event.endDate,
      timezone: event.timezone,
      status: event.status,
      venueId: event.venueId,
      coverImageUrl: event.coverImageUrl,
      createdAt: event.createdAt.toISOString(),
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
  }

  async listManageableEvents(user: User) {
    const qb = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.venue', 'venue')
      .leftJoinAndSelect('event.organization', 'organization')
      .orderBy('event.start_date', 'DESC');

    if (user.role === UserRole.ORGANIZER) {
      if (!user.organizationId) return { data: [] };
      qb.where('event.organization_id = :orgId', {
        orgId: user.organizationId,
      });
    }

    const events = await qb.getMany();
    return {
      data: events.map((event) => ({
        id: event.id,
        organizationId: event.organizationId,
        organizationName: event.organization?.name ?? null,
        name: event.name,
        status: event.status,
        startDate: event.startDate,
        endDate: event.endDate,
        venue: event.venue
          ? {
              name: event.venue.name,
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
      })),
    };
  }

  async listCustomers(page = 1, pageSize = 10) {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const currentPage = Math.max(page, 1);
    const skip = (currentPage - 1) * take;

    const [users, total] = await this.userRepository.findAndCount({
      where: { role: UserRole.VISITOR },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });

    return {
      data: users.map((customer) => ({
        id: customer.id,
        displayName: customer.displayName,
        email: customer.email,
        phone: customer.phone,
        status: 'active' as const,
        createdAt: customer.createdAt.toISOString(),
      })),
      meta: {
        page: currentPage,
        pageSize: take,
        total,
        totalPages: Math.max(1, Math.ceil(total / take)),
      },
    };
  }

  async listCategories(eventId: string, user: User) {
    await this.assertEventAccess(user, eventId);

    const categories = await this.categoryRepository.find({
      where: { eventId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
    return {
      data: categories.map((category) => ({
        id: category.id,
        name: category.name,
        icon: category.icon,
      })),
    };
  }

  async listVendorAuditLogs(eventId: string, user: User, limit = 50) {
    await this.assertEventAccess(user, eventId);
    const logs = await this.auditLogRepository.find({
      where: { eventId },
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 200),
    });
    return { data: logs };
  }

  async listVendors(eventId: string, user: User) {
    await this.assertEventAccess(user, eventId);
    const vendors = await this.vendorRepository.find({
      where: { eventId },
      relations: ['category'],
      order: { createdAt: 'DESC' },
    });
    return {
      data: vendors.map((v) => this.formatAdminVendor(v)),
    };
  }

  async createVendor(eventId: string, dto: CreateVendorDto, user: User) {
    const event = await this.assertEventAccess(user, eventId);
    const bounds = this.resolveVenueBounds(event.venue);
    if (bounds) this.assertWithinBounds(bounds, dto.latitude, dto.longitude);
    await assertUniqueBooth(this.vendorRepository, eventId, dto.boothNumber);
    const vendor = await this.persistVendor(eventId, dto, user);
    await this.recordAudit({
      eventId,
      entityId: vendor.id,
      action: 'create',
      user,
      metadata: {
        name: vendor.name,
        boothNumber: vendor.boothNumber,
        latitude: Number(vendor.latitude),
        longitude: Number(vendor.longitude),
      },
    });
    return this.formatAdminVendor(await this.getVendorWithCategory(vendor.id));
  }

  async updateVendor(
    eventId: string,
    vendorId: string,
    dto: UpdateVendorDto,
    user: User,
  ) {
    const vendor = await this.getEventVendor(eventId, vendorId);
    const event = await this.assertEventAccess(user, eventId);

    if (dto.latitude !== undefined || dto.longitude !== undefined) {
      const nextLat = dto.latitude ?? Number(vendor.latitude);
      const nextLng = dto.longitude ?? Number(vendor.longitude);
      const bounds = this.resolveVenueBounds(event.venue);
      if (bounds) this.assertWithinBounds(bounds, nextLat, nextLng);
    }

    if (dto.boothNumber !== undefined) {
      await assertUniqueBooth(
        this.vendorRepository,
        eventId,
        dto.boothNumber,
        vendorId,
      );
    }

    Object.assign(vendor, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.boothNumber !== undefined && { boothNumber: dto.boothNumber }),
      ...(dto.zone !== undefined && { zone: dto.zone }),
      ...(dto.latitude !== undefined && { latitude: dto.latitude }),
      ...(dto.longitude !== undefined && { longitude: dto.longitude }),
      ...(dto.phone !== undefined && { phone: dto.phone }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      updatedById: user.id,
    });

    if (dto.isActive === true && !vendor.isActive) {
      vendor.deactivatedAt = null;
      vendor.deactivatedById = null;
    }

    await this.vendorRepository.save(vendor);
    await this.recordAudit({
      eventId,
      entityId: vendor.id,
      action: 'update',
      user,
      metadata: { changes: dto },
    });
    return this.formatAdminVendor(vendor);
  }

  async deleteVendor(eventId: string, vendorId: string, user: User) {
    const vendor = await this.getEventVendor(eventId, vendorId);
    await this.assertEventAccess(user, eventId);

    vendor.isActive = false;
    vendor.deactivatedAt = new Date();
    vendor.deactivatedById = user.id;
    vendor.updatedById = user.id;
    await this.vendorRepository.save(vendor);
    await this.notificationsService.cancelRemindersForVendor(vendorId);
    await this.recordAudit({
      eventId,
      entityId: vendor.id,
      action: 'deactivate',
      user,
      metadata: { name: vendor.name },
    });
    return { message: 'Vendor deactivated' };
  }

  async bulkImport(eventId: string, dto: BulkImportVendorsDto, user: User) {
    const event = await this.assertEventAccess(user, eventId);
    const bounds = this.resolveVenueBounds(event.venue);
    const categories = await this.categoryRepository.find({
      where: { eventId },
    });
    const categoryByName = new Map(
      categories.map((category) => [category.name.toLowerCase(), category.id]),
    );

    const results: Array<{
      row: number;
      status: 'success' | 'failed';
      errors?: string[];
      vendor?: ReturnType<AdminService['formatAdminVendor']>;
    }> = [];

    for (let index = 0; index < dto.vendors.length; index++) {
      const row = dto.vendors[index];
      const rowNumber = index + 1;
      const normalized = this.normalizeBulkRow(row, categoryByName);
      const instance = plainToInstance(CreateVendorDto, normalized);
      const validationErrors = await validate(instance);

      if (validationErrors.length) {
        results.push({
          row: rowNumber,
          status: 'failed',
          errors: this.flattenValidationErrors(validationErrors),
        });
        continue;
      }

      try {
        if (bounds) {
          this.assertWithinBounds(
            bounds,
            instance.latitude,
            instance.longitude,
          );
        }

        const vendor = await this.persistVendor(eventId, instance, user);
        await this.recordAudit({
          eventId,
          entityId: vendor.id,
          action: 'bulk_import',
          user,
          metadata: { row: rowNumber, name: vendor.name },
        });
        results.push({
          row: rowNumber,
          status: 'success',
          vendor: this.formatAdminVendor(
            await this.getVendorWithCategory(vendor.id),
          ),
        });
      } catch (error) {
        results.push({
          row: rowNumber,
          status: 'failed',
          errors: [
            error instanceof Error ? error.message : 'Import failed for row',
          ],
        });
      }
    }

    const imported = results.filter(
      (result) => result.status === 'success',
    ).length;
    return {
      total: dto.vendors.length,
      imported,
      failed: dto.vendors.length - imported,
      results,
    };
  }

  async generateAllQr(eventId: string, user: User, regenerate = false) {
    await this.assertEventAccess(user, eventId);
    const vendors = await this.vendorRepository.find({
      where: { eventId, isActive: true },
      order: { boothNumber: 'ASC', name: 'ASC' },
    });
    const data: { vendorId: string; qrPayload: string }[] = [];

    for (const vendor of vendors) {
      if (!vendor.qrCodePayload || regenerate) {
        await this.assignQrPayload(vendor);
      }
      data.push({
        vendorId: vendor.id,
        qrPayload: vendor.qrCodePayload ?? '',
      });
    }

    return { generated: data.length, data };
  }

  async buildQrPdf(eventId: string, user: User) {
    const event = await this.assertEventAccess(user, eventId);
    const vendors = await this.vendorRepository.find({
      where: { eventId, isActive: true },
      order: { boothNumber: 'ASC', name: 'ASC' },
    });

    for (const vendor of vendors) {
      if (!vendor.qrCodePayload) {
        await this.assignQrPayload(vendor);
      }
    }

    const printable = vendors.filter((vendor) => vendor.qrCodePayload);
    if (!printable.length) {
      throw new NotFoundException(
        'No active vendors available for QR printing',
      );
    }

    const buffer = await buildVendorQrPdf(
      event.name,
      printable.map((vendor) => ({
        id: vendor.id,
        name: vendor.name,
        boothNumber: vendor.boothNumber,
        zone: vendor.zone,
        qrCodePayload: vendor.qrCodePayload as string,
      })),
    );

    return {
      buffer,
      filename: `fvl-qr-codes-${eventId.slice(0, 8)}.pdf`,
    };
  }

  async buildSingleVendorQrPdf(eventId: string, vendorId: string, user: User) {
    const event = await this.assertEventAccess(user, eventId);
    const vendor = await this.getEventVendor(eventId, vendorId);

    if (!vendor.isActive) {
      throw new BadRequestException('Inactive vendors cannot be printed');
    }

    if (!vendor.qrCodePayload) {
      await this.assignQrPayload(vendor);
    }

    const buffer = await buildVendorQrPdf(event.name, [
      {
        id: vendor.id,
        name: vendor.name,
        boothNumber: vendor.boothNumber,
        zone: vendor.zone,
        qrCodePayload: vendor.qrCodePayload as string,
      },
    ]);

    return {
      buffer,
      filename: `fvl-qr-${vendor.slug}.pdf`,
    };
  }

  async createAnnouncement(
    eventId: string,
    dto: CreateAnnouncementDto,
    user: User,
  ) {
    await this.assertEventAccess(user, eventId);
    const announcement = await this.announcementRepository.save(
      this.announcementRepository.create({
        eventId,
        title: dto.title,
        body: dto.body,
        priority: dto.priority ?? AnnouncementPriority.NORMAL,
        publishedAt: new Date(),
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        updatedById: user.id,
      }),
    );
    const push =
      await this.pushDeliveryService.dispatchAnnouncement(announcement);
    await this.recordAudit({
      eventId,
      entityId: announcement.id,
      action: 'create',
      user,
      entityType: 'announcement',
      metadata: { title: announcement.title },
    });
    return this.formatAdminAnnouncement(announcement, push);
  }

  async listAnnouncements(eventId: string, user: User) {
    await this.assertEventAccess(user, eventId);
    const announcements = await this.announcementRepository.find({
      where: { eventId, deletedAt: IsNull() },
      order: { publishedAt: 'DESC' },
    });
    return {
      data: announcements.map((item) => this.formatAdminAnnouncement(item)),
    };
  }

  async updateAnnouncement(
    eventId: string,
    announcementId: string,
    dto: UpdateAnnouncementDto,
    user: User,
  ) {
    await this.assertEventAccess(user, eventId);
    const announcement = await this.getEventAnnouncement(
      eventId,
      announcementId,
    );

    Object.assign(announcement, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.body !== undefined && { body: dto.body }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.expiresAt !== undefined && {
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      }),
      updatedById: user.id,
    });

    await this.announcementRepository.save(announcement);
    await this.recordAudit({
      eventId,
      entityId: announcement.id,
      action: 'update',
      user,
      entityType: 'announcement',
      metadata: { changes: dto },
    });
    return this.formatAdminAnnouncement(announcement);
  }

  async deleteAnnouncement(
    eventId: string,
    announcementId: string,
    user: User,
  ) {
    await this.assertEventAccess(user, eventId);
    const announcement = await this.getEventAnnouncement(
      eventId,
      announcementId,
    );
    announcement.deletedAt = new Date();
    announcement.deletedById = user.id;
    announcement.updatedById = user.id;
    await this.announcementRepository.save(announcement);
    await this.recordAudit({
      eventId,
      entityId: announcement.id,
      action: 'delete',
      user,
      entityType: 'announcement',
      metadata: { title: announcement.title },
    });
    return { message: 'Announcement deleted' };
  }

  private async getEventAnnouncement(eventId: string, announcementId: string) {
    const announcement = await this.announcementRepository.findOne({
      where: { id: announcementId, eventId, deletedAt: IsNull() },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }
    return announcement;
  }

  private formatAdminAnnouncement(announcement: Announcement, push?: unknown) {
    const now = new Date();
    const expired = !!announcement.expiresAt && announcement.expiresAt <= now;
    return {
      id: announcement.id,
      eventId: announcement.eventId,
      title: announcement.title,
      body: announcement.body,
      priority: announcement.priority,
      publishedAt: announcement.publishedAt,
      expiresAt: announcement.expiresAt,
      updatedAt: announcement.updatedAt,
      status: expired ? 'expired' : 'published',
      ...(push !== undefined ? { push } : {}),
    };
  }

  async adminDashboard(eventId: string, user: User, compareEventId?: string) {
    await this.assertEventAccess(user, eventId);
    if (compareEventId) {
      await this.assertEventAccess(user, compareEventId);
    }

    const analytics = await this.analyticsService.dashboard(
      eventId,
      compareEventId,
    );
    const vendorCount = await this.vendorRepository.count({
      where: { eventId, isActive: true },
    });
    const announcementCount = await this.announcementRepository.count({
      where: { eventId, deletedAt: IsNull() },
    });

    return {
      activeVendors: vendorCount,
      announcements: announcementCount,
      ...analytics,
    };
  }

  async buildDashboardPdf(
    eventId: string,
    user: User,
    compareEventId?: string,
  ) {
    const dashboard = await this.adminDashboard(eventId, user, compareEventId);
    const buffer = await buildDashboardPdf({
      eventName: dashboard.eventName,
      eventStartDate: dashboard.eventStartDate,
      eventEndDate: dashboard.eventEndDate,
      generatedAt: dashboard.lastUpdatedAt,
      dau: dashboard.dau,
      activeUsers: dashboard.activeUsers,
      totalSearches: dashboard.totalSearches,
      navigationStarts: dashboard.navigationStarts,
      qrScans: dashboard.qrScans,
      topVendors: dashboard.topVendors,
      dailyTrend: dashboard.dailyTrend,
      comparison: dashboard.comparison
        ? {
            eventName: dashboard.comparison.eventName,
            dau: dashboard.comparison.dau,
            activeUsers: dashboard.comparison.activeUsers,
            totalSearches: dashboard.comparison.totalSearches,
            navigationStarts: dashboard.comparison.navigationStarts,
            qrScans: dashboard.comparison.qrScans,
          }
        : null,
    });

    return {
      buffer,
      filename: `fvl-dashboard-${eventId.slice(0, 8)}.pdf`,
    };
  }

  async createContactConsentRequest(
    eventId: string,
    vendorId: string,
    dto: CreateContactConsentAdminDto,
    user: User,
  ) {
    await this.assertEventAccess(user, eventId);
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId, eventId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found for this event');
    }
    return this.contactConsentService.createRequest(vendorId, {
      eventId,
      userId: dto.userId,
      userEmail: dto.userEmail,
    });
  }

  async listContactConsentRequests(
    eventId: string,
    vendorId: string,
    user: User,
  ) {
    await this.assertEventAccess(user, eventId);
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId, eventId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found for this event');
    }
    return this.contactConsentService.listForVendor(vendorId);
  }

  private async persistVendor(
    eventId: string,
    dto: CreateVendorDto,
    user: User,
  ) {
    await assertUniqueBooth(this.vendorRepository, eventId, dto.boothNumber);

    const slug =
      dto.slug ??
      dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const vendor = await this.vendorRepository.save(
      this.vendorRepository.create({
        eventId,
        name: dto.name,
        slug,
        categoryId: dto.categoryId ?? null,
        description: dto.description ?? null,
        boothNumber: dto.boothNumber ?? null,
        zone: dto.zone ?? null,
        latitude: dto.latitude,
        longitude: dto.longitude,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        logoUrl: dto.logoUrl ?? null,
        isActive: dto.isActive ?? true,
        createdById: user.id,
        updatedById: user.id,
      }),
    );

    await this.assignQrPayload(vendor);
    return vendor;
  }

  private normalizeBulkRow(
    row: BulkImportVendorRowDto,
    categoryByName: Map<string, string>,
  ) {
    const normalized: CreateVendorDto = {
      name: row.name,
      slug: row.slug,
      description: row.description,
      boothNumber: row.boothNumber,
      zone: row.zone,
      latitude: row.latitude,
      longitude: row.longitude,
      phone: row.phone,
      email: row.email,
      logoUrl: row.logoUrl,
      isActive: row.isActive,
      categoryId: row.categoryId,
    };

    if (!normalized.categoryId && row.categoryName) {
      normalized.categoryId =
        categoryByName.get(row.categoryName.trim().toLowerCase()) ?? undefined;
    }

    return normalized;
  }

  private async assertEventAccess(user: User, eventId: string) {
    const event = await this.eventsService.ensureEvent(eventId);
    if (user.role === UserRole.ADMIN) return event;
    if (user.role === UserRole.ORGANIZER) {
      if (user.organizationId && user.organizationId === event.organizationId) {
        return event;
      }
      throw new ForbiddenException('Not authorized for this event');
    }
    throw new ForbiddenException('Admin access required');
  }

  private assertOrganizationAccess(user: User, organizationId: string) {
    if (user.role === UserRole.ADMIN) return;
    if (user.role === UserRole.ORGANIZER) {
      if (user.organizationId && user.organizationId === organizationId) return;
      throw new ForbiddenException('Not authorized for this organization');
    }
    throw new ForbiddenException('Admin access required');
  }

  private async recordAudit(input: {
    eventId: string;
    entityId: string;
    action: string;
    user: User;
    entityType?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.auditLogRepository.save(
      this.auditLogRepository.create({
        eventId: input.eventId,
        entityType: input.entityType ?? 'vendor',
        entityId: input.entityId,
        action: input.action,
        userId: input.user.id,
        userDisplayName: input.user.displayName,
        metadata: input.metadata ?? null,
      }),
    );
  }

  private flattenValidationErrors(
    errors: Awaited<ReturnType<typeof validate>>,
  ): string[] {
    const messages: string[] = [];
    for (const error of errors) {
      if (error.constraints) {
        messages.push(...Object.values(error.constraints));
      }
      if (error.children?.length) {
        messages.push(...this.flattenValidationErrors(error.children));
      }
    }
    return messages;
  }

  private async getEventVendor(eventId: string, vendorId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId, eventId },
      relations: ['category'],
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }

  private async getVendorWithCategory(vendorId: string) {
    return this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['category'],
    }) as Promise<Vendor>;
  }

  private async assignQrPayload(vendor: Vendor) {
    const secret = this.configService.get<string>('qr.hmacSecret') ?? '';
    vendor.qrCodePayload = buildQrPayload(vendor.eventId, vendor.id, secret);
    await this.vendorRepository.save(vendor);
  }

  private formatAdminVendor(vendor: Vendor) {
    return {
      id: vendor.id,
      eventId: vendor.eventId,
      name: vendor.name,
      slug: vendor.slug,
      description: vendor.description,
      categoryId: vendor.categoryId,
      category: vendor.category?.name ?? null,
      boothNumber: vendor.boothNumber,
      zone: vendor.zone,
      latitude: Number(vendor.latitude),
      longitude: Number(vendor.longitude),
      phone: vendor.phone,
      email: vendor.email,
      isActive: vendor.isActive,
      qrCodePayload: vendor.qrCodePayload,
      avgRating: Number(vendor.avgRating),
      reviewCount: vendor.reviewCount,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
      createdById: vendor.createdById,
      deactivatedAt: vendor.deactivatedAt,
      deactivatedById: vendor.deactivatedById,
    };
  }
}
