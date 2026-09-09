import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
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
import { EventsModule } from '../events/events.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ContactConsentModule } from '../contact-consent/contact-consent.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vendor,
      Product,
      Promotion,
      Announcement,
      AnalyticsEvent,
      AdminAuditLog,
      Event,
      Category,
      User,
      Organization,
      Venue,
    ]),
    EventsModule,
    AnalyticsModule,
    ContactConsentModule,
    NotificationsModule,
    MediaModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
