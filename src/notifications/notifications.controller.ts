import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import {
  RegisterDeviceTokenDto,
  RevokeDeviceTokenDto,
  CreateReminderDto,
} from './dto/notifications.dto';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('users/me/device-tokens')
  @UseGuards(JwtAuthGuard)
  registerDeviceToken(
    @CurrentUser() user: User,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(user.id, dto);
  }

  @Delete('users/me/device-tokens')
  @UseGuards(JwtAuthGuard)
  revokeDeviceTokens(
    @CurrentUser() user: User,
    @Body() dto: RevokeDeviceTokenDto,
  ) {
    return this.notificationsService.revokeDeviceTokens(user.id, dto.token);
  }

  @Get('events/:eventId/announcements')
  getAnnouncements(@Param('eventId') eventId: string) {
    return this.notificationsService.getAnnouncements(eventId);
  }

  @Get('events/:eventId/announcements/:announcementId')
  getAnnouncement(
    @Param('eventId') eventId: string,
    @Param('announcementId') announcementId: string,
  ) {
    return this.notificationsService.getAnnouncement(eventId, announcementId);
  }

  @Get('users/me/notifications')
  @UseGuards(JwtAuthGuard)
  getInbox(@CurrentUser() user: User, @Query('eventId') eventId?: string) {
    return this.notificationsService.getInbox(user.id, eventId);
  }

  @Patch('users/me/notifications/:id/read')
  @UseGuards(JwtAuthGuard)
  markRead(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notificationsService.markRead(user.id, id);
  }

  @Post('users/me/reminders')
  @UseGuards(JwtAuthGuard)
  createReminder(@CurrentUser() user: User, @Body() dto: CreateReminderDto) {
    return this.notificationsService.createReminder(user.id, dto);
  }

  @Get('users/me/reminders')
  @UseGuards(JwtAuthGuard)
  listReminders(@CurrentUser() user: User) {
    return this.notificationsService.listReminders(user.id);
  }

  @Delete('users/me/reminders/:id')
  @UseGuards(JwtAuthGuard)
  deleteReminder(@CurrentUser() user: User, @Param('id') id: string) {
    return this.notificationsService.deleteReminder(user.id, id);
  }
}
