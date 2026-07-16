import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { AddFavoriteDto, FavoritesQueryDto } from './dto/favorite.dto';

@Controller('users/me/favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: FavoritesQueryDto) {
    return this.favoritesService.list(user.id, query.eventId);
  }

  @Post()
  add(@CurrentUser() user: User, @Body() dto: AddFavoriteDto) {
    return this.favoritesService.add(user, dto);
  }

  @Delete(':vendorId')
  remove(@CurrentUser() user: User, @Param('vendorId') vendorId: string) {
    return this.favoritesService.remove(user.id, vendorId);
  }
}
