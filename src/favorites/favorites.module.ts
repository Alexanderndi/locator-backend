import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { Favorite } from '../entities/favorite.entity';
import { Vendor } from '../entities/vendor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Favorite, Vendor])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
