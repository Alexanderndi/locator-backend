import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  ContactConsentController,
  VendorContactConsentController,
} from './contact-consent.controller';
import { ContactConsentService } from './contact-consent.service';
import { ContactConsentRequest } from '../entities/contact-consent-request.entity';
import { Favorite } from '../entities/favorite.entity';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { User } from '../entities/user.entity';
import { Vendor } from '../entities/vendor.entity';
import { EventsModule } from '../events/events.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContactConsentRequest,
      Favorite,
      AnalyticsEvent,
      User,
      Vendor,
    ]),
    EventsModule,
    VendorsModule,
  ],
  controllers: [ContactConsentController, VendorContactConsentController],
  providers: [ContactConsentService],
  exports: [ContactConsentService],
})
export class ContactConsentModule {}
