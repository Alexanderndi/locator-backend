import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushDeliveryService } from './push-delivery.service';
import { ReminderSchedulerService } from './reminder-scheduler.service';
import { DeviceToken } from '../entities/device-token.entity';
import { Announcement } from '../entities/announcement.entity';
import { VendorReminder } from '../entities/vendor-reminder.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { Favorite } from '../entities/favorite.entity';
import { EventsModule } from '../events/events.module';
import { VendorsModule } from '../vendors/vendors.module';
import { ContactConsentModule } from '../contact-consent/contact-consent.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DeviceToken,
      Announcement,
      VendorReminder,
      UserPreference,
      Favorite,
    ]),
    EventsModule,
    VendorsModule,
    ContactConsentModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    PushDeliveryService,
    ReminderSchedulerService,
  ],
  exports: [NotificationsService, PushDeliveryService],
})
export class NotificationsModule {}
