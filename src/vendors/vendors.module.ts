import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { Vendor } from '../entities/vendor.entity';
import { Product } from '../entities/product.entity';
import { Promotion } from '../entities/promotion.entity';
import { Review } from '../entities/review.entity';
import { Favorite } from '../entities/favorite.entity';
import { ScheduleItem } from '../entities/schedule-item.entity';
import { EventsModule } from '../events/events.module';
import { MediaModule } from '../media/media.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vendor,
      Product,
      Promotion,
      Review,
      Favorite,
      ScheduleItem,
    ]),
    EventsModule,
    MediaModule,
  ],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
