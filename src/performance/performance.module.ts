import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { PerformanceEvent } from '../entities/performance-event.entity';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { EventsModule } from '../events/events.module';
import { PerformanceLoggingInterceptor } from './logging.interceptor';

@Module({
  imports: [
    TypeOrmModule.forFeature([PerformanceEvent, AnalyticsEvent]),
    EventsModule,
  ],
  controllers: [PerformanceController],
  providers: [
    PerformanceService,
    {
      provide: APP_INTERCEPTOR,
      useClass: PerformanceLoggingInterceptor,
    },
  ],
  exports: [PerformanceService],
})
export class PerformanceModule {}
