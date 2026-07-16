import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorPortalController } from './vendor-portal.controller';
import { VendorPortalService } from './vendor-portal.service';
import { Vendor } from '../entities/vendor.entity';
import { EventsModule } from '../events/events.module';
import { ContactConsentModule } from '../contact-consent/contact-consent.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vendor]),
    EventsModule,
    ContactConsentModule,
    AuthModule,
  ],
  controllers: [VendorPortalController],
  providers: [VendorPortalService],
})
export class VendorPortalModule {}
