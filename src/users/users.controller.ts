import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import {
  UpdateUserDto,
  DeleteUserDto,
  UpdatePreferencesDto,
} from './dto/user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@CurrentUser() user: User) {
    return this.usersService.getProfile(user);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  updateMe(@CurrentUser() user: User, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(user, dto);
  }

  @Get('me/preferences')
  @UseGuards(JwtAuthGuard)
  getPreferences(@CurrentUser() user: User) {
    return this.usersService.getPreferences(user.id);
  }

  @Patch('me/preferences')
  @UseGuards(JwtAuthGuard)
  updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @Delete('me')
  @UseGuards(JwtAuthGuard)
  deleteMe(@CurrentUser() user: User, @Body() dto: DeleteUserDto) {
    return this.usersService.softDelete(user, dto);
  }
}
