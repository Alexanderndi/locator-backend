import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Favorite } from '../entities/favorite.entity';
import { Vendor } from '../entities/vendor.entity';
import { User } from '../entities/user.entity';
import { AddFavoriteDto } from './dto/favorite.dto';

@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Vendor)
    private readonly vendorRepository: Repository<Vendor>,
  ) {}

  async list(userId: string, eventId?: string) {
    const where: { userId: string; eventId?: string } = { userId };
    if (eventId) where.eventId = eventId;

    const favorites = await this.favoriteRepository.find({
      where,
      relations: ['vendor', 'vendor.category'],
      order: { createdAt: 'DESC' },
    });

    return {
      data: favorites.map((f) => ({
        id: f.vendor.id,
        name: f.vendor.name,
        boothNumber: f.vendor.boothNumber,
        zone: f.vendor.zone,
        latitude: Number(f.vendor.latitude),
        longitude: Number(f.vendor.longitude),
        category: f.vendor.category?.name ?? null,
        logoUrl: f.vendor.logoUrl,
        avgRating: Number(f.vendor.avgRating),
        reviewCount: f.vendor.reviewCount,
        hasPromotion: false,
        eventId: f.eventId,
        favoriteId: f.id,
        createdAt: f.createdAt,
      })),
    };
  }

  async add(user: User, dto: AddFavoriteDto) {
    const vendor = await this.vendorRepository.findOne({
      where: { id: dto.vendorId, eventId: dto.eventId },
    });
    if (!vendor) {
      throw new NotFoundException('Vendor not found for this event');
    }

    const existing = await this.favoriteRepository.findOne({
      where: { userId: user.id, vendorId: dto.vendorId },
    });
    if (existing) {
      return {
        id: existing.id,
        vendorId: existing.vendorId,
        eventId: existing.eventId,
        createdAt: existing.createdAt,
        alreadyExists: true,
      };
    }

    const favorite = await this.favoriteRepository.save(
      this.favoriteRepository.create({
        userId: user.id,
        vendorId: dto.vendorId,
        eventId: dto.eventId,
      }),
    );

    return {
      id: favorite.id,
      vendorId: favorite.vendorId,
      eventId: favorite.eventId,
      createdAt: favorite.createdAt,
      alreadyExists: false,
    };
  }

  async remove(userId: string, vendorId: string) {
    const favorite = await this.favoriteRepository.findOne({
      where: { userId, vendorId },
    });
    if (!favorite) {
      throw new NotFoundException('Favorite not found');
    }
    await this.favoriteRepository.remove(favorite);
    return { message: 'Favorite removed' };
  }
}
