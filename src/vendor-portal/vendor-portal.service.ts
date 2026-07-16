import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Vendor } from '../entities/vendor.entity';
import { UserRole } from '../common/enums';
import { AuthService } from '../auth/auth.service';
import { ContactConsentService } from '../contact-consent/contact-consent.service';
import { EventsService } from '../events/events.service';
import { VendorRequestConsentDto } from './dto/vendor-portal.dto';

@Injectable()
export class VendorPortalService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    private readonly authService: AuthService,
    private readonly contactConsentService: ContactConsentService,
    private readonly eventsService: EventsService,
  ) {}

  private ensureVendorUser(user: User): string {
    if (user.role !== UserRole.VENDOR || !user.vendorId) {
      throw new ForbiddenException('Vendor account required');
    }
    return user.vendorId;
  }

  async getDashboard(user: User) {
    const vendorId = this.ensureVendorUser(user);
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['category', 'event', 'event.venue'],
    });
    if (!vendor) {
      throw new NotFoundException('Linked vendor booth not found');
    }

    const event = await this.eventsService.findOne(vendor.eventId);

    return {
      user: this.authService.sanitizeUser(user),
      vendor: {
        id: vendor.id,
        name: vendor.name,
        boothNumber: vendor.boothNumber,
        zone: vendor.zone,
        category: vendor.category?.name ?? null,
        description: vendor.description,
        viewCount: vendor.viewCount,
        avgRating: Number(vendor.avgRating),
        reviewCount: vendor.reviewCount,
      },
      event,
    };
  }

  async listContactConsent(user: User) {
    const vendorId = this.ensureVendorUser(user);
    return this.contactConsentService.listForVendor(vendorId);
  }

  async requestContactConsent(user: User, dto: VendorRequestConsentDto) {
    const vendorId = this.ensureVendorUser(user);
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
    });
    if (!vendor) {
      throw new NotFoundException('Linked vendor booth not found');
    }

    return this.contactConsentService.createRequest(vendorId, {
      eventId: dto.eventId ?? vendor.eventId,
      userEmail: dto.userEmail.toLowerCase(),
    });
  }
}
