import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vendor } from '../entities/vendor.entity';
import { Product } from '../entities/product.entity';
import { Promotion } from '../entities/promotion.entity';
import { Review } from '../entities/review.entity';
import { Favorite } from '../entities/favorite.entity';
import { ScheduleItem } from '../entities/schedule-item.entity';
import { User } from '../entities/user.entity';
import { EventsService } from '../events/events.service';
import { MediaService } from '../media/media.service';
import { UserRole } from '../common/enums';
import { haversineDistanceMeters, roundCoordinate } from '../common/utils/geo.util';
import { paginate } from '../common/utils/pagination.util';
import { CreateReviewDto, UpdateReviewDto } from './dto/vendor.dto';
import { resolveReviewStatus } from '../common/utils/moderation.util';
import type { ReviewStatus } from '../entities/review.entity';

@Injectable()
export class VendorsService {
  constructor(
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Promotion)
    private readonly promotionRepository: Repository<Promotion>,
    @InjectRepository(Review)
    private readonly reviewRepository: Repository<Review>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(ScheduleItem)
    private readonly scheduleRepository: Repository<ScheduleItem>,
    private readonly eventsService: EventsService,
    private readonly mediaService: MediaService,
  ) {}

  async listByEvent(eventId: string, page = 1, pageSize = 20) {
    const event = await this.eventsService.ensureEvent(eventId);
    const vendors = await this.vendorRepository.find({
      where: { eventId, isActive: true },
      relations: ['category', 'promotions'],
      order: { name: 'ASC' },
    });
    const formatted = vendors.map((v) => this.formatVendorSummary(v, event));
    return paginate(formatted, page, pageSize);
  }

  async search(
    eventId: string,
    q?: string,
    category?: string,
    offers?: boolean,
    page = 1,
    pageSize = 20,
  ) {
    const event = await this.eventsService.ensureEvent(eventId);
    let vendors = await this.vendorRepository.find({
      where: { eventId, isActive: true },
      relations: ['category', 'promotions'],
    });

    if (q) {
      const query = q.toLowerCase();
      vendors = vendors.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          (v.description?.toLowerCase().includes(query) ?? false) ||
          (v.boothNumber?.toLowerCase().includes(query) ?? false),
      );
    }
    if (category) {
      vendors = vendors.filter((v) => v.categoryId === category);
    }
    if (offers) {
      vendors = vendors.filter((v) => this.hasActivePromotion(v, event));
    }

    const formatted = vendors.map((v) => this.formatVendorSummary(v, event));
    return paginate(formatted, page, pageSize);
  }

  async nearby(eventId: string, lat: number, lng: number, radius = 500) {
    const event = await this.eventsService.ensureEvent(eventId);
    const eventOpen = this.isEventOpen(event);
    const vendors = await this.vendorRepository.find({
      where: { eventId, isActive: true },
      relations: ['category', 'promotions'],
    });

    const nearby = vendors
      .map((v) => ({
        vendor: v,
        distance: haversineDistanceMeters(
          lat,
          lng,
          Number(v.latitude),
          Number(v.longitude),
        ),
      }))
      .filter(({ distance }) => distance <= radius)
      .sort((a, b) => {
        if (a.distance !== b.distance) {
          return a.distance - b.distance;
        }
        if (b.vendor.viewCount !== a.vendor.viewCount) {
          return b.vendor.viewCount - a.vendor.viewCount;
        }
        return b.vendor.reviewCount - a.vendor.reviewCount;
      });

    const data = await Promise.all(
      nearby.map(async ({ vendor, distance }) => ({
        ...(this.formatVendorSummary(vendor, event)),
        distance: Math.round(distance),
        latitude: roundCoordinate(Number(vendor.latitude)),
        longitude: roundCoordinate(Number(vendor.longitude)),
        isOpen: vendor.isActive && eventOpen,
      })),
    );

    return { data, meta: { total: data.length, radius } };
  }

  async recommended(eventId: string, user?: User) {
    const event = await this.eventsService.ensureEvent(eventId);
    const vendors = await this.vendorRepository.find({
      where: { eventId, isActive: true },
      relations: ['category', 'promotions'],
    });

    let favoriteCategoryIds: string[] = [];
    if (user) {
      const favorites = await this.favoriteRepository.find({
        where: { userId: user.id, eventId },
        relations: ['vendor'],
      });
      favoriteCategoryIds = [
        ...new Set(
          favorites
            .map((f) => f.vendor?.categoryId)
            .filter((id): id is string => !!id),
        ),
      ];
    }

    const scored = vendors.map((v) => {
      let score = v.viewCount * 0.3 + Number(v.avgRating) * 10 + v.reviewCount;
      if (this.hasActivePromotion(v, event)) score += 5;
      if (user && v.categoryId && favoriteCategoryIds.includes(v.categoryId)) {
        score += 15;
      }
      return { vendor: v, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 10);
    const data = top.map(({ vendor }) => this.formatVendorSummary(vendor, event));
    return { data, personalized: !!user };
  }

  async findOne(vendorId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['category', 'event', 'promotions'],
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    vendor.viewCount += 1;
    await this.vendorRepository.save(vendor);

    const products = await this.productRepository.find({
      where: { vendorId, isAvailable: true },
      order: { sortOrder: 'ASC' },
    });

    const images = this.buildGallery(vendor.logoUrl, products);
    const openingHours = await this.resolveOpeningHours(vendor);
    const activePromotions = (vendor.promotions ?? [])
      .filter((p) => this.isPromotionActive(p, vendor.event))
      .map((p) => this.formatPromotion(p));

    return {
      id: vendor.id,
      eventId: vendor.eventId,
      name: vendor.name,
      slug: vendor.slug,
      description: this.stripHtml(vendor.description),
      boothNumber: vendor.boothNumber,
      zone: vendor.zone,
      phone: vendor.phone,
      email: vendor.email,
      website: vendor.website,
      logoUrl: vendor.logoUrl,
      latitude: Number(vendor.latitude),
      longitude: Number(vendor.longitude),
      avgRating: Number(vendor.avgRating),
      reviewCount: vendor.reviewCount,
      category: vendor.category
        ? { id: vendor.category.id, name: vendor.category.name }
        : null,
      hasPromotion: activePromotions.length > 0,
      promotions: activePromotions,
      qrCodePayload: vendor.qrCodePayload,
      images,
      openingHours,
    };
  }

  async getProducts(vendorId: string, page = 1, pageSize = 20) {
    await this.ensureVendor(vendorId);
    const products = await this.productRepository.find({
      where: { vendorId },
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    const formatted = products.map((p) => this.formatProduct(p));

    return paginate(formatted, page, pageSize);
  }

  async listMyCatalogue(user: User, page = 1, pageSize = 50) {
    const vendorId = this.ensureVendorUser(user);
    return this.getProducts(vendorId, page, pageSize);
  }

  async createCatalogueItem(
    user: User,
    file: Express.Multer.File,
    name?: string,
  ) {
    const vendorId = this.ensureVendorUser(user);
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const saved = this.mediaService.saveCatalogueImage(file);
    const maxSort = await this.productRepository
      .createQueryBuilder('product')
      .select('MAX(product.sort_order)', 'max')
      .where('product.vendor_id = :vendorId', { vendorId })
      .getRawOne<{ max: number | null }>();

    const product = await this.productRepository.save(
      this.productRepository.create({
        vendorId,
        name: name?.trim() || null,
        description: null,
        price: null,
        maxPrice: null,
        imageUrl: saved.imageUrl,
        mimeType: saved.mimeType,
        sortOrder: Number(maxSort?.max ?? 0) + 1,
        isAvailable: true,
      }),
    );

    return this.formatProduct(product);
  }

  async deleteCatalogueItem(user: User, productId: string) {
    const vendorId = this.ensureVendorUser(user);
    const product = await this.productRepository.findOne({
      where: { id: productId, vendorId },
    });
    if (!product) {
      throw new NotFoundException('Catalogue item not found');
    }

    this.mediaService.deleteCatalogueImage(product.imageUrl);
    await this.productRepository.remove(product);
    return { message: 'Catalogue item deleted' };
  }

  private ensureVendorUser(user: User): string {
    if (user.role !== UserRole.VENDOR || !user.vendorId) {
      throw new ForbiddenException('Vendor account required');
    }
    return user.vendorId;
  }

  private formatProduct(p: Product) {
    return {
      id: p.id,
      name: p.name?.trim() || 'Catalogue item',
      description: p.description,
      price: this.normalizePrice(p.price),
      maxPrice: this.normalizePrice(p.maxPrice),
      currency: p.currency,
      imageUrl: this.mediaService.toPublicUrl(p.imageUrl),
      mimeType: p.mimeType,
      isAvailable: p.isAvailable,
      priceLabel: this.formatPriceLabel(
        this.normalizePrice(p.price),
        this.normalizePrice(p.maxPrice),
        p.currency,
      ),
    };
  }

  async getPromotions(vendorId: string) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
      relations: ['event'],
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const promotions = await this.promotionRepository.find({
      where: { vendorId, isActive: true },
    });
    return {
      data: promotions
        .filter((p) => this.isPromotionActive(p, vendor.event))
        .map((p) => this.formatPromotion(p)),
    };
  }

  async getReviews(
    vendorId: string,
    page = 1,
    pageSize = 20,
    user?: User,
  ) {
    await this.ensureVendor(vendorId);
    const approved = await this.reviewRepository.find({
      where: { vendorId, status: 'approved' },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    const formatted = approved.map((r) => this.formatReview(r, user?.id));
    const paginated = paginate(formatted, page, pageSize);

    let userReview: ReturnType<VendorsService['formatReview']> | null = null;
    if (user) {
      const own = await this.reviewRepository.findOne({
        where: { vendorId, userId: user.id },
        relations: ['user'],
      });
      if (own) {
        userReview = this.formatReview(own, user.id);
      }
    }

    return {
      ...paginated,
      userReview,
    };
  }

  async createReview(vendorId: string, user: User, dto: CreateReviewDto) {
    await this.ensureVendor(vendorId);
    const existing = await this.reviewRepository.findOne({
      where: { vendorId, userId: user.id },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this vendor');
    }

    const status = resolveReviewStatus(dto.comment);
    const review = await this.reviewRepository.save(
      this.reviewRepository.create({
        vendorId,
        userId: user.id,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
        status,
      }),
    );

    const aggregate = await this.recalculateVendorRatings(vendorId);
    const saved = await this.reviewRepository.findOne({
      where: { id: review.id },
      relations: ['user'],
    });

    return {
      ...this.formatReview(saved!, user.id),
      aggregate,
      moderationMessage:
        status === 'pending'
          ? 'Your review is pending moderation and will appear once approved.'
          : null,
    };
  }

  async updateReview(vendorId: string, user: User, dto: UpdateReviewDto) {
    await this.ensureVendor(vendorId);
    const review = await this.reviewRepository.findOne({
      where: { vendorId, userId: user.id },
      relations: ['user'],
    });
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const editDeadline = new Date(review.createdAt);
    editDeadline.setHours(editDeadline.getHours() + 24);
    if (new Date() > editDeadline) {
      throw new ConflictException('Reviews can only be edited within 24 hours');
    }

    if (dto.rating != null) {
      review.rating = dto.rating;
    }
    if (dto.comment !== undefined) {
      review.comment = dto.comment?.trim() || null;
    }
    review.status = resolveReviewStatus(review.comment);

    await this.reviewRepository.save(review);
    const aggregate = await this.recalculateVendorRatings(vendorId);

    return {
      ...this.formatReview(review, user.id),
      aggregate,
      moderationMessage:
        review.status === 'pending'
          ? 'Your updated review is pending moderation.'
          : null,
    };
  }

  private formatReview(review: Review, currentUserId?: string) {
    const canEdit =
      !!currentUserId &&
      review.userId === currentUserId &&
      this.canEditReview(review);

    return {
      id: review.id,
      userId: review.userId,
      rating: review.rating,
      comment: review.comment,
      status: review.status as ReviewStatus,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      isOwn: currentUserId != null && review.userId === currentUserId,
      canEdit,
      user: { displayName: review.user?.displayName ?? 'Visitor' },
      userName: review.user?.displayName ?? 'Visitor',
    };
  }

  private canEditReview(review: Review): boolean {
    const editDeadline = new Date(review.createdAt);
    editDeadline.setHours(editDeadline.getHours() + 24);
    return new Date() <= editDeadline;
  }

  private async recalculateVendorRatings(vendorId: string) {
    const approved = await this.reviewRepository.find({
      where: { vendorId, status: 'approved' },
    });
    const reviewCount = approved.length;
    const avgRating =
      reviewCount > 0
        ? approved.reduce((sum, r) => sum + r.rating, 0) / reviewCount
        : 0;

    await this.vendorRepository.update(vendorId, {
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount,
    });

    return {
      avgRating: Math.round(avgRating * 10) / 10,
      reviewCount,
    };
  }

  private isEventOpen(event: { startDate: string; endDate: string; status: string }) {
    if (event.status !== 'active') return false;
    const today = new Date().toISOString().slice(0, 10);
    return today >= event.startDate && today <= event.endDate;
  }

  private normalizePrice(value: number | null | undefined): number | null {
    if (value == null) return null;
    const price = Number(value);
    if (Number.isNaN(price) || price < 0) return null;
    return Math.round(price * 100) / 100;
  }

  private formatPriceLabel(
    price: number | null,
    maxPrice: number | null,
    currency = 'NGN',
  ): string | null {
    if (price == null) return null;
    const symbol = currency === 'NGN' ? '₦' : currency;
    const formatted = `${symbol}${price.toLocaleString('en-NG')}`;
    if (maxPrice != null && maxPrice > price) {
      return `From ${formatted}`;
    }
    return formatted;
  }

  private stripHtml(value: string | null): string | null {
    if (!value) return null;
    return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  private buildGallery(
    logoUrl: string | null,
    products: Product[],
  ): string[] {
    const images = new Set<string>();
    const logo = this.mediaService.toPublicUrl(logoUrl);
    if (logo) images.add(logo);
    for (const product of products) {
      const url = this.mediaService.toPublicUrl(product.imageUrl);
      if (url) images.add(url);
    }
    return [...images];
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-NG', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Lagos',
    });
  }

  private async resolveOpeningHours(vendor: Vendor): Promise<string> {
    const defaultHours = '10:00 AM – 9:00 PM';
    const event = vendor.event;
    if (!event) {
      return `Daily: ${defaultHours}`;
    }

    const today = new Date().toISOString().slice(0, 10);
    const scheduleItems = await this.scheduleRepository.find({
      where: { eventId: vendor.eventId },
      order: { startTime: 'ASC' },
    });

    const todayItems = scheduleItems.filter((item) => {
      const day =
        item.dayLabel ?? item.startTime.toISOString().slice(0, 10);
      return day === today;
    });

    const vendorZone = vendor.zone?.toLowerCase() ?? '';
    const zoneOverride = todayItems.find((item) => {
      const location = item.location?.toLowerCase() ?? '';
      return (
        location.length > 0 &&
        vendorZone.length > 0 &&
        (location.includes(vendorZone) || vendorZone.includes(location))
      );
    });

    if (zoneOverride) {
      const start = this.formatTime(zoneOverride.startTime);
      const end = zoneOverride.endTime
        ? this.formatTime(zoneOverride.endTime)
        : '10:00 PM';
      return `Today: ${start} – ${end} (${zoneOverride.title})`;
    }

    const eventOverride = todayItems[0];
    if (eventOverride) {
      const start = this.formatTime(eventOverride.startTime);
      const end = eventOverride.endTime
        ? this.formatTime(eventOverride.endTime)
        : '10:00 PM';
      return `Today: ${start} – ${end} · Event schedule: ${eventOverride.title}`;
    }

    return `Daily during event: ${defaultHours}`;
  }

  private isPromotionActive(
    promotion: Promotion,
    event?: { startDate: string; endDate: string } | null,
  ): boolean {
    if (!promotion.isActive) return false;

    const now = new Date();
    if (promotion.startDate && now < new Date(promotion.startDate)) {
      return false;
    }
    if (promotion.endDate && now > new Date(promotion.endDate)) {
      return false;
    }

    if (event?.startDate && event?.endDate) {
      const eventStart = new Date(`${event.startDate}T00:00:00`);
      const eventEnd = new Date(`${event.endDate}T23:59:59.999`);
      const promoStart = promotion.startDate ?? eventStart;
      const promoEnd = promotion.endDate ?? eventEnd;
      if (promoEnd < eventStart || promoStart > eventEnd) {
        return false;
      }
    }

    return true;
  }

  private hasActivePromotion(
    vendor: Vendor,
    event?: { startDate: string; endDate: string } | null,
  ): boolean {
    return (
      vendor.promotions?.some((p) => this.isPromotionActive(p, event)) ?? false
    );
  }

  private formatPromotion(promotion: Promotion) {
    return {
      id: promotion.id,
      title: promotion.title,
      description: promotion.description,
      discountPercent: promotion.discountPercent
        ? Number(promotion.discountPercent)
        : null,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
    };
  }

  private formatVendorSummary(
    vendor: Vendor,
    event?: { startDate: string; endDate: string } | null,
  ) {
                  return {
      id: vendor.id,
      name: vendor.name,
      category: vendor.category?.name ?? null,
      boothNumber: vendor.boothNumber,
      zone: vendor.zone,
      latitude: Number(vendor.latitude),
      longitude: Number(vendor.longitude),
      hasPromotion: this.hasActivePromotion(vendor, event),
      logoUrl: vendor.logoUrl,
      avgRating: Number(vendor.avgRating),
      reviewCount: vendor.reviewCount,
    };
  }

  async ensureVendor(vendorId: string): Promise<Vendor> {
    const vendor = await this.vendorRepository.findOne({
      where: { id: vendorId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');
    return vendor;
  }
}
