import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      Venue,
      Event,
      VenueMap,
      Category,
      Vendor,
      Product,
      Promotion,
      ScheduleItem,
      Announcement,
      User,
      UserPreference,
      Favorite,
      Review,
      ContactConsentRequest,
    ]),
  ],
  providers: [SeedService],
})
export class SeedModule {}
