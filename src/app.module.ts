import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration from './config/configuration';
import { ALL_ENTITIES } from './entities';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { VendorsModule } from './vendors/vendors.module';
import { FavoritesModule } from './favorites/favorites.module';
import { MapsModule } from './maps/maps.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminModule } from './admin/admin.module';
import { SeedModule } from './seed/seed.module';
import { ContactConsentModule } from './contact-consent/contact-consent.module';
import { VendorPortalModule } from './vendor-portal/vendor-portal.module';
import { PerformanceModule } from './performance/performance.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'better-sqlite3' as const,
        database: configService.get<string>('database.path') ?? 'fvl.db',
        entities: ALL_ENTITIES,
        synchronize: true,
      }),
    }),
    AuthModule,
    UsersModule,
    EventsModule,
    VendorsModule,
    FavoritesModule,
    MapsModule,
    NotificationsModule,
    AnalyticsModule,
    AdminModule,
    SeedModule,
    ContactConsentModule,
    VendorPortalModule,
    PerformanceModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
