import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Organization } from '../entities/organization.entity';
import { Venue } from '../entities/venue.entity';
import { Event } from '../entities/event.entity';
import { VenueMap } from '../entities/venue-map.entity';
import { Category } from '../entities/category.entity';
import { Vendor } from '../entities/vendor.entity';
import { Product } from '../entities/product.entity';
import { Promotion } from '../entities/promotion.entity';
import { ScheduleItem } from '../entities/schedule-item.entity';
import { Announcement } from '../entities/announcement.entity';
import { User } from '../entities/user.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { Favorite } from '../entities/favorite.entity';
import { Review } from '../entities/review.entity';
import { ContactConsentRequest } from '../entities/contact-consent-request.entity';
import { ContactConsentStatus } from '../common/enums';
import { EventStatus, UserRole, AnnouncementPriority } from '../common/enums';
import { buildQrPayload } from '../common/utils/qr.util';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly orgRepository: Repository<Organization>,
    @InjectRepository(Venue)
    private readonly venueRepository: Repository<Venue>,
    @InjectRepository(Event)
    private readonly eventRepository: Repository<Event>,
    @InjectRepository(VenueMap)
    private readonly venueMapRepository: Repository<VenueMap>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(ScheduleItem)
    private readonly scheduleRepository: Repository<ScheduleItem>,
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(ContactConsentRequest)
    private readonly consentRepository: Repository<ContactConsentRequest>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const count = await this.eventRepository.count();
    if (count > 0) {
      await this.migrateLegacyEventBranding();
      await this.ensureDemoVendorAccount();
      await this.ensureMamaEkaetteDetails();
      await this.ensureDemoReviews();
      await this.ensureDemoContactConsent();
      await this.ensureOrganizerAccount();
      this.logger.log('Database already seeded, skipping');
      return;
    }
    this.logger.log('Seeding demo data...');
    await this.seed();
    this.logger.log('Seed complete');
  }

  /** Renames the legacy Lagos Trade Fair demo event if still present. */
  private async migrateLegacyEventBranding() {
    const legacy = await this.eventRepository.findOne({
      where: { name: 'Lagos International Trade Fair 2026' },
      relations: ['venue', 'organization'],
    });
    if (!legacy) return;

    legacy.name = 'Akwa Ibom Xmas Village 2026';
    legacy.description =
      'A festive Christmas village experience featuring food, fashion, crafts, and holiday shopping in Uyo.';
    legacy.startDate = '2026-12-01';
    legacy.endDate = '2026-12-31';
    legacy.coverImageUrl =
      'https://cdn.fvl.io/events/akwa-ibom-xmas-village-2026-cover.jpg';
    await this.eventRepository.save(legacy);

    if (legacy.venue) {
      legacy.venue.name = 'Akwa Ibom Xmas Village Grounds';
      legacy.venue.address = 'Uyo Township Stadium Area, Uyo, Akwa Ibom, Nigeria';
      legacy.venue.latitude = 5.0379;
      legacy.venue.longitude = 7.9128;
      await this.venueRepository.save(legacy.venue);
    }

    if (legacy.organization) {
      legacy.organization.name = 'Akwa Ibom Xmas Village Committee';
      legacy.organization.description = 'Organizer of the Akwa Ibom Xmas Village';
      await this.orgRepository.save(legacy.organization);
    }

    const announcements = await this.announcementRepository.find({
      where: { eventId: legacy.id },
    });
    for (const a of announcements) {
      if (a.title === 'Welcome to LITF 2026!') {
        a.title = 'Welcome to Akwa Ibom Xmas Village 2026!';
        a.body =
          'Explore festive vendors across 8 categories. Use the map to navigate the village.';
        await this.announcementRepository.save(a);
      }
    }

    this.logger.log('Migrated legacy event branding to Akwa Ibom Xmas Village 2026');
  }

  private async ensureDemoVendorAccount() {
    const existing = await this.userRepository.findOne({
      where: { email: 'vendor@mamaekaette.fvl.io' },
    });
    if (existing) return;

    const mamaEkaette = await this.vendorRepository.findOne({
      where: { slug: 'mama-ekaette-kitchen' },
    });
    if (!mamaEkaette) return;

    const vendorHash = await bcrypt.hash('VendorPass1', 12);
    const vendorUser = await this.userRepository.save(
      this.userRepository.create({
        email: 'vendor@mamaekaette.fvl.io',
        passwordHash: vendorHash,
        displayName: 'Mama Ekaette Kitchen',
        role: UserRole.VENDOR,
        vendorId: mamaEkaette.id,
      }),
    );

    await this.preferenceRepository.save(
      this.preferenceRepository.create({
        userId: vendorUser.id,
        readNotificationIds: [],
      }),
    );

    this.logger.log('Seeded demo vendor account (vendor@mamaekaette.fvl.io)');
  }

  private async ensureMamaEkaetteDetails() {
    const mamaEkaette = await this.vendorRepository.findOne({
      where: { slug: 'mama-ekaette-kitchen' },
    });
    if (!mamaEkaette) return;

    mamaEkaette.description =
      'Home-style Akwa Ibom and Nigerian classics from Mama Ekaette. Famous for smoky party jollof, pepper soup, and festive holiday platters served fresh at Food Court booth F-12.';
    mamaEkaette.phone = mamaEkaette.phone ?? '+2348012345678';
    mamaEkaette.email = mamaEkaette.email ?? 'hello@mamaekaette.fvl.io';
    mamaEkaette.website = mamaEkaette.website ?? 'https://mamaekaette.fvl.io';
    mamaEkaette.boothNumber = mamaEkaette.boothNumber ?? 'F-12';
    mamaEkaette.zone = mamaEkaette.zone ?? 'Food Court';
    mamaEkaette.logoUrl =
      mamaEkaette.logoUrl ?? 'https://cdn.fvl.io/vendors/mama-ekaette-kitchen.png';
    await this.vendorRepository.save(mamaEkaette);

    const desiredProducts = [
      {
        name: 'Jollof Rice Plate',
        description: 'Smoky party jollof with grilled chicken and plantain',
        price: 3500,
        maxPrice: 4500,
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-jollof.jpg',
        sortOrder: 1,
        isAvailable: true,
      },
      {
        name: 'Pepper Soup',
        description: 'Spicy goat meat pepper soup with scent leaves',
        price: 2800,
        maxPrice: null as number | null,
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-pepper-soup.jpg',
        sortOrder: 2,
        isAvailable: true,
      },
      {
        name: 'Puff Puff (6 pcs)',
        description: 'Fresh fried dough balls dusted with sugar',
        price: 800,
        maxPrice: null as number | null,
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-puff-puff.jpg',
        sortOrder: 3,
        isAvailable: false,
      },
      {
        name: 'Afang Soup & Pounded Yam',
        description: 'Traditional Afang with fish and assorted meats',
        price: 4500,
        maxPrice: 5500,
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-afang.jpg',
        sortOrder: 4,
        isAvailable: true,
      },
      {
        name: 'Festive Christmas Platter',
        description: 'Family platter with jollof, fried rice, chicken, and salad',
        price: 12000,
        maxPrice: null as number | null,
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-platter.jpg',
        sortOrder: 5,
        isAvailable: true,
      },
      {
        name: 'Zobo Drink',
        description: 'Chilled hibiscus drink with pineapple and ginger',
        price: 700,
        maxPrice: null as number | null,
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-zobo.jpg',
        sortOrder: 6,
        isAvailable: true,
      },
    ];

    for (const item of desiredProducts) {
      const existing = await this.productRepository.findOne({
        where: { vendorId: mamaEkaette.id, name: item.name },
      });
      if (existing) {
        existing.description = item.description;
        existing.price = item.price;
        existing.maxPrice = item.maxPrice;
        existing.imageUrl = item.imageUrl;
        existing.sortOrder = item.sortOrder;
        existing.isAvailable = item.isAvailable;
        existing.currency = 'NGN';
        await this.productRepository.save(existing);
        continue;
      }

      await this.productRepository.save(
        this.productRepository.create({
          vendorId: mamaEkaette.id,
          name: item.name,
          description: item.description,
          price: item.price,
          maxPrice: item.maxPrice,
          currency: 'NGN',
          imageUrl: item.imageUrl,
          sortOrder: item.sortOrder,
          isAvailable: item.isAvailable,
        }),
      );
    }

    this.logger.log('Ensured full Mama Ekaette Kitchen profile details');
  }

  private async ensureDemoReviews() {
    const mamaEkaette = await this.vendorRepository.findOne({
      where: { slug: 'mama-ekaette-kitchen' },
    });
    const demo = await this.userRepository.findOne({
      where: { email: 'demo@fvl.io' },
    });
    if (!mamaEkaette || !demo) return;

    const existing = await this.reviewRepository.count({
      where: { vendorId: mamaEkaette.id },
    });
    if (existing > 0) return;

    const chioma = await this.userRepository.save(
      this.userRepository.create({
        email: 'chioma.udo@fvl.io',
        passwordHash: await bcrypt.hash('DemoPass1', 12),
        displayName: 'Chioma Udo',
        role: UserRole.VISITOR,
      }),
    );

    await this.reviewRepository.save([
      this.reviewRepository.create({
        vendorId: mamaEkaette.id,
        userId: demo.id,
        rating: 5,
        comment: 'Best jollof at the village! Friendly service and generous portions.',
        status: 'approved',
      }),
      this.reviewRepository.create({
        vendorId: mamaEkaette.id,
        userId: chioma.id,
        rating: 4,
        comment: 'Great food court spot. Pepper soup was excellent.',
        status: 'approved',
      }),
    ]);

    const approved = await this.reviewRepository.find({
      where: { vendorId: mamaEkaette.id, status: 'approved' },
    });
    const reviewCount = approved.length;
    const avgRating =
      approved.reduce((sum, r) => sum + r.rating, 0) / reviewCount;
    await this.vendorRepository.update(mamaEkaette.id, {
      reviewCount,
      avgRating: Math.round(avgRating * 10) / 10,
    });

    this.logger.log('Seeded demo reviews for Mama Ekaette Kitchen');
  }

  private async ensureDemoContactConsent() {
    const mamaEkaette = await this.vendorRepository.findOne({
      where: { slug: 'mama-ekaette-kitchen' },
    });
    const demo = await this.userRepository.findOne({
      where: { email: 'demo@fvl.io' },
    });
    if (!mamaEkaette || !demo) return;

    if (!demo.phone) {
      demo.phone = '+2348012345678';
      await this.userRepository.save(demo);
    }

    const existing = await this.consentRepository.findOne({
      where: { vendorId: mamaEkaette.id, userId: demo.id },
    });
    if (existing) return;

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.consentRepository.save(
      this.consentRepository.create({
        vendorId: mamaEkaette.id,
        userId: demo.id,
        eventId: mamaEkaette.eventId,
        status: ContactConsentStatus.PENDING,
        requestedAt: now,
        expiresAt,
      }),
    );

    this.logger.log('Seeded demo contact consent request for demo@fvl.io');
  }

  private async ensureOrganizerAccount() {
    const org = await this.orgRepository.findOne({
      where: { name: 'Akwa Ibom Xmas Village Committee' },
    });
    if (!org) return;

    const existing = await this.userRepository.findOne({
      where: { email: 'organizer@fvl.io' },
    });
    if (existing) {
      if (!existing.organizationId) {
        existing.organizationId = org.id;
        await this.userRepository.save(existing);
      }
      return;
    }

    const organizerHash = await bcrypt.hash('OrganizerPass1', 12);
    const organizer = await this.userRepository.save(
      this.userRepository.create({
        email: 'organizer@fvl.io',
        passwordHash: organizerHash,
        displayName: 'Event Organizer',
        role: UserRole.ORGANIZER,
        organizationId: org.id,
      }),
    );

    await this.preferenceRepository.save(
      this.preferenceRepository.create({
        userId: organizer.id,
        readNotificationIds: [],
      }),
    );

    this.logger.log('Ensured organizer@fvl.io demo account');
  }

  private async seed() {
    const org = await this.orgRepository.save(
      this.orgRepository.create({
        name: 'Akwa Ibom Xmas Village Committee',
        description: 'Organizer of the Akwa Ibom Xmas Village',
        contactEmail: 'info@akwaibomxmasvillage.ng',
      }),
    );

    const venue = await this.venueRepository.save(
      this.venueRepository.create({
        name: 'Akwa Ibom Xmas Village Grounds',
        address: 'Uyo Township Stadium Area, Uyo, Akwa Ibom, Nigeria',
        latitude: 5.0379,
        longitude: 7.9128,
        boundaryNorth: 5.0419,
        boundarySouth: 5.0339,
        boundaryEast: 7.9168,
        boundaryWest: 7.9088,
      }),
    );

    const event = await this.eventRepository.save(
      this.eventRepository.create({
        organizationId: org.id,
        venueId: venue.id,
        name: 'Akwa Ibom Xmas Village 2026',
        description:
          'A festive Christmas village experience featuring food, fashion, crafts, and holiday shopping in Uyo.',
        startDate: '2026-12-01',
        endDate: '2026-12-31',
        timezone: 'Africa/Lagos',
        status: EventStatus.ACTIVE,
        coverImageUrl: 'https://cdn.fvl.io/events/akwa-ibom-xmas-village-2026-cover.jpg',
      }),
    );

    await this.eventRepository.save(
      this.eventRepository.create({
        organizationId: org.id,
        venueId: venue.id,
        name: 'Lagos Food & Culture Fest 2027',
        description:
          'A preview of next season\'s food and culture festival at the same venue.',
        startDate: '2027-02-01',
        endDate: '2027-02-14',
        timezone: 'Africa/Lagos',
        status: EventStatus.PUBLISHED,
        coverImageUrl: 'https://cdn.fvl.io/events/lagos-food-culture-fest-2027-cover.jpg',
      }),
    );

    await this.venueMapRepository.save(
      this.venueMapRepository.create({
        eventId: event.id,
        centerLat: 5.0379,
        centerLng: 7.9128,
        floorPlanUrl: 'https://cdn.fvl.io/maps/akwa-ibom-xmas-village-2026-floorplan.png',
        tileUrlTemplate:
          'https://cdn.fvl.io/maps/akwa-ibom-xmas-village-2026/{z}/{x}/{y}.png',
      }),
    );

    const categoryNames = [
      { name: 'Food', icon: 'food' },
      { name: 'Fashion', icon: 'fashion' },
      { name: 'Electronics', icon: 'electronics' },
      { name: 'Crafts', icon: 'crafts' },
      { name: 'Agriculture', icon: 'agriculture' },
      { name: 'Health', icon: 'health' },
      { name: 'Art', icon: 'art' },
      { name: 'Services', icon: 'services' },
    ];

    const categories: Category[] = [];
    for (let i = 0; i < categoryNames.length; i++) {
      categories.push(
        await this.categoryRepository.save(
          this.categoryRepository.create({
            eventId: event.id,
            name: categoryNames[i].name,
            icon: categoryNames[i].icon,
            sortOrder: i,
          }),
        ),
      );
    }

    const cat = (name: string) =>
      categories.find((c) => c.name === name)?.id ?? categories[0].id;

    const vendorDefs = [
      { name: 'Mama Ekaette Kitchen', slug: 'mama-ekaette-kitchen', category: 'Food', booth: 'F-12', zone: 'Food Court', lat: 5.0383, lng: 7.9131, views: 120 },
      { name: 'Adunni Fashion House', slug: 'adunni-fashion', category: 'Fashion', booth: 'A-05', zone: 'Hall A', lat: 5.0375, lng: 7.9124, views: 85 },
      { name: 'TechHub Nigeria', slug: 'techhub-nigeria', category: 'Electronics', booth: 'E-22', zone: 'Tech Pavilion', lat: 5.0385, lng: 7.9136, views: 95 },
      { name: 'Kano Crafts Collective', slug: 'kano-crafts', category: 'Crafts', booth: 'C-08', zone: 'Craft Village', lat: 5.0373, lng: 7.9126, views: 60 },
      { name: 'GreenHarvest Farms', slug: 'greenharvest-farms', category: 'Agriculture', booth: 'AG-03', zone: 'Agri Zone', lat: 5.0377, lng: 7.9121, views: 45 },
      { name: 'Wellness Plus Clinic', slug: 'wellness-plus', category: 'Health', booth: 'H-15', zone: 'Health Row', lat: 5.0370, lng: 7.9134, views: 30 },
      { name: 'Uyo Art Gallery', slug: 'uyo-art-gallery', category: 'Art', booth: 'AR-07', zone: 'Art Walk', lat: 5.0381, lng: 7.9130, views: 55 },
      { name: 'FixIt Services', slug: 'fixit-services', category: 'Services', booth: 'S-11', zone: 'Services Hub', lat: 5.0367, lng: 7.9138, views: 25 },
      { name: 'Spice Route Kitchen', slug: 'spice-route', category: 'Food', booth: 'F-14', zone: 'Food Court', lat: 5.0384, lng: 7.9129, views: 70 },
      { name: 'Ankara Dreams', slug: 'ankara-dreams', category: 'Fashion', booth: 'A-12', zone: 'Hall A', lat: 5.0376, lng: 7.9122, views: 65 },
      { name: 'PowerCell Electronics', slug: 'powercell', category: 'Electronics', booth: 'E-18', zone: 'Tech Pavilion', lat: 5.0387, lng: 7.9134, views: 80 },
      { name: 'Bead & Wire Studio', slug: 'bead-wire-studio', category: 'Crafts', booth: 'C-15', zone: 'Craft Village', lat: 5.0371, lng: 7.9128, views: 40 },
      { name: 'Organic Roots', slug: 'organic-roots', category: 'Agriculture', booth: 'AG-09', zone: 'Agri Zone', lat: 5.0379, lng: 7.9116, views: 35 },
      { name: 'Herbal Life Nigeria', slug: 'herbal-life-ng', category: 'Health', booth: 'H-08', zone: 'Health Row', lat: 5.0373, lng: 7.9136, views: 28 },
      { name: 'Canvas & Clay', slug: 'canvas-clay', category: 'Art', booth: 'AR-12', zone: 'Art Walk', lat: 5.0382, lng: 7.9120, views: 50 },
    ];

    const qrSecret = this.configService.get<string>('qr.hmacSecret') ?? '';
    const vendors: Vendor[] = [];

    for (const def of vendorDefs) {
      const isMama = def.slug === 'mama-ekaette-kitchen';
      const vendor = await this.vendorRepository.save(
        this.vendorRepository.create({
          eventId: event.id,
          name: def.name,
          slug: def.slug,
          categoryId: cat(def.category),
          description: isMama
            ? 'Home-style Akwa Ibom and Nigerian classics from Mama Ekaette. Famous for smoky party jollof, pepper soup, and festive holiday platters served fresh at Food Court booth F-12.'
            : `${def.name} — premium ${def.category.toLowerCase()} vendor at Akwa Ibom Xmas Village 2026.`,
          boothNumber: def.booth,
          zone: def.zone,
          phone: isMama ? '+2348012345678' : null,
          email: isMama ? 'hello@mamaekaette.fvl.io' : null,
          website: isMama ? 'https://mamaekaette.fvl.io' : null,
          latitude: def.lat,
          longitude: def.lng,
          isActive: true,
          viewCount: def.views,
          logoUrl: `https://cdn.fvl.io/vendors/${def.slug}.png`,
          avgRating: isMama ? 4.5 : 0,
          reviewCount: isMama ? 2 : 0,
        }),
      );
      vendor.qrCodePayload = buildQrPayload(event.id, vendor.id, qrSecret);
      await this.vendorRepository.save(vendor);
      vendors.push(vendor);
    }

    const mamaEkaette = vendors.find((v) => v.slug === 'mama-ekaette-kitchen')!;

    await this.productRepository.save([
      this.productRepository.create({
        vendorId: mamaEkaette.id,
        name: 'Jollof Rice Plate',
        description: 'Smoky party jollof with grilled chicken and plantain',
        price: 3500,
        maxPrice: 4500,
        currency: 'NGN',
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-jollof.jpg',
        sortOrder: 1,
        isAvailable: true,
      }),
      this.productRepository.create({
        vendorId: mamaEkaette.id,
        name: 'Pepper Soup',
        description: 'Spicy goat meat pepper soup with scent leaves',
        price: 2800,
        currency: 'NGN',
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-pepper-soup.jpg',
        sortOrder: 2,
        isAvailable: true,
      }),
      this.productRepository.create({
        vendorId: mamaEkaette.id,
        name: 'Puff Puff (6 pcs)',
        description: 'Fresh fried dough balls dusted with sugar',
        price: 800,
        currency: 'NGN',
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-puff-puff.jpg',
        sortOrder: 3,
        isAvailable: false,
      }),
      this.productRepository.create({
        vendorId: mamaEkaette.id,
        name: 'Afang Soup & Pounded Yam',
        description: 'Traditional Afang with fish and assorted meats',
        price: 4500,
        maxPrice: 5500,
        currency: 'NGN',
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-afang.jpg',
        sortOrder: 4,
        isAvailable: true,
      }),
      this.productRepository.create({
        vendorId: mamaEkaette.id,
        name: 'Festive Christmas Platter',
        description: 'Family platter with jollof, fried rice, chicken, and salad',
        price: 12000,
        currency: 'NGN',
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-platter.jpg',
        sortOrder: 5,
        isAvailable: true,
      }),
      this.productRepository.create({
        vendorId: mamaEkaette.id,
        name: 'Zobo Drink',
        description: 'Chilled hibiscus drink with pineapple and ginger',
        price: 700,
        currency: 'NGN',
        imageUrl: 'https://cdn.fvl.io/vendors/mama-ekaette-zobo.jpg',
        sortOrder: 6,
        isAvailable: true,
      }),
    ]);

    await this.promotionRepository.save([
      this.promotionRepository.create({
        vendorId: mamaEkaette.id,
        title: 'Opening Day Special',
        description: '20% off all jollof orders before 2pm',
        discountPercent: 20,
        startDate: new Date('2026-12-01'),
        endDate: new Date('2026-12-31'),
        isActive: true,
      }),
      this.promotionRepository.create({
        vendorId: mamaEkaette.id,
        title: 'Lunch Combo Deal',
        description: '15% off any combo meal',
        discountPercent: 15,
        isActive: true,
      }),
      this.promotionRepository.create({
        vendorId: mamaEkaette.id,
        title: 'Expired Summer Promo',
        description: 'This offer has ended',
        discountPercent: 10,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-06-30'),
        isActive: false,
      }),
      this.promotionRepository.create({
        vendorId: vendors.find((v) => v.slug === 'techhub-nigeria')!.id,
        title: 'Phone Accessory Bundle',
        description: 'Buy 2 get 1 free on phone cases',
        discountPercent: 33,
        isActive: true,
      }),
    ]);

    const scheduleNow = new Date();
    const todayLabel = scheduleNow.toISOString().slice(0, 10);
    const ongoingStart = new Date(scheduleNow.getTime() - 30 * 60 * 1000);
    const ongoingEnd = new Date(scheduleNow.getTime() + 90 * 60 * 1000);

    const scheduleItems = [
      {
        title: 'Live Village Welcome Session',
        day: todayLabel,
        start: ongoingStart,
        end: ongoingEnd,
        loc: 'Main Arena',
        description: 'Ongoing welcome briefing for visitors arriving today.',
      },
      {
        title: 'Village Opening Night',
        day: '2026-12-01',
        start: new Date('2026-12-01T17:00:00'),
        end: new Date('2026-12-01T19:00:00'),
        loc: 'Main Arena',
        description: 'Official opening night at Akwa Ibom Xmas Village 2026',
      },
      {
        title: 'Fashion & Ankara Showcase',
        day: '2026-12-10',
        start: new Date('2026-12-10T14:00:00'),
        end: new Date('2026-12-10T16:00:00'),
        loc: 'Hall A',
        description: 'Fashion runway featuring local designers and Ankara styles.',
      },
      {
        title: 'Christmas Carols & Lights',
        day: '2026-12-15',
        start: new Date('2026-12-15T18:00:00'),
        end: new Date('2026-12-15T20:00:00'),
        loc: 'Main Arena',
        description: 'Community carol service with light show.',
      },
      {
        title: 'Food & Spice Festival',
        day: '2026-12-20',
        start: new Date('2026-12-20T12:00:00'),
        end: new Date('2026-12-20T15:00:00'),
        loc: 'Food Court',
        description: 'Tasting sessions across Food Court vendors.',
      },
      {
        title: "New Year's Eve Celebration",
        day: '2026-12-31',
        start: new Date('2026-12-31T20:00:00'),
        end: new Date('2027-01-01T00:30:00'),
        loc: 'Main Arena',
        description: 'Countdown festivities and fireworks.',
      },
    ];

    for (const item of scheduleItems) {
      await this.scheduleRepository.save(
        this.scheduleRepository.create({
          eventId: event.id,
          title: item.title,
          description: item.description,
          startTime: item.start,
          endTime: item.end,
          location: item.loc,
          dayLabel: item.day,
        }),
      );
    }

    await this.announcementRepository.save([
      this.announcementRepository.create({
        eventId: event.id,
        title: 'Welcome to Akwa Ibom Xmas Village 2026!',
        body: 'Explore festive vendors across 8 categories. Use the map to navigate the village.',
        priority: AnnouncementPriority.HIGH,
        publishedAt: new Date(),
      }),
      this.announcementRepository.create({
        eventId: event.id,
        title: 'Food Court Extended Hours',
        body: 'Food Court vendors open until 9pm on weekends.',
        priority: AnnouncementPriority.NORMAL,
        publishedAt: new Date(),
      }),
    ]);

    const adminHash = await bcrypt.hash('AdminPass1', 12);
    const demoHash = await bcrypt.hash('DemoPass1', 12);

    const admin = await this.userRepository.save(
      this.userRepository.create({
        email: 'admin@fvl.io',
        passwordHash: adminHash,
        displayName: 'FVL Admin',
        role: UserRole.ADMIN,
      }),
    );

    const organizerHash = await bcrypt.hash('OrganizerPass1', 12);
    const organizer = await this.userRepository.save(
      this.userRepository.create({
        email: 'organizer@fvl.io',
        passwordHash: organizerHash,
        displayName: 'Event Organizer',
        role: UserRole.ORGANIZER,
        organizationId: org.id,
      }),
    );

    const demo = await this.userRepository.save(
      this.userRepository.create({
        email: 'demo@fvl.io',
        passwordHash: demoHash,
        displayName: 'Demo Visitor',
        phone: '+2348012345678',
        role: UserRole.VISITOR,
      }),
    );

    for (const user of [admin, organizer, demo]) {
      await this.preferenceRepository.save(
        this.preferenceRepository.create({
          userId: user.id,
          readNotificationIds: [],
        }),
      );
    }

    await this.favoriteRepository.save(
      this.favoriteRepository.create({
        userId: demo.id,
        vendorId: mamaEkaette.id,
        eventId: event.id,
      }),
    );

    const vendorHash = await bcrypt.hash('VendorPass1', 12);
    const vendorUser = await this.userRepository.save(
      this.userRepository.create({
        email: 'vendor@mamaekaette.fvl.io',
        passwordHash: vendorHash,
        displayName: 'Mama Ekaette Kitchen',
        role: UserRole.VENDOR,
        vendorId: mamaEkaette.id,
      }),
    );

    await this.preferenceRepository.save(
      this.preferenceRepository.create({
        userId: vendorUser.id,
        readNotificationIds: [],
      }),
    );

    const chioma = await this.userRepository.save(
      this.userRepository.create({
        email: 'chioma.udo@fvl.io',
        passwordHash: await bcrypt.hash('DemoPass1', 12),
        displayName: 'Chioma Udo',
        role: UserRole.VISITOR,
      }),
    );

    await this.preferenceRepository.save(
      this.preferenceRepository.create({
        userId: chioma.id,
        readNotificationIds: [],
      }),
    );

    await this.reviewRepository.save([
      this.reviewRepository.create({
        vendorId: mamaEkaette.id,
        userId: demo.id,
        rating: 5,
        comment: 'Best jollof at the village! Friendly service and generous portions.',
        status: 'approved',
      }),
      this.reviewRepository.create({
        vendorId: mamaEkaette.id,
        userId: chioma.id,
        rating: 4,
        comment: 'Great food court spot. Pepper soup was excellent.',
        status: 'approved',
      }),
    ]);

    await this.vendorRepository.update(mamaEkaette.id, {
      reviewCount: 2,
      avgRating: 4.5,
    });

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.consentRepository.save(
      this.consentRepository.create({
        vendorId: mamaEkaette.id,
        userId: demo.id,
        eventId: event.id,
        status: ContactConsentStatus.PENDING,
        requestedAt: now,
        expiresAt,
      }),
    );
  }
}
