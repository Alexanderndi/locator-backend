import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { DeviceToken } from '../entities/device-token.entity';
import { Announcement } from '../entities/announcement.entity';
import { VendorReminder } from '../entities/vendor-reminder.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { Favorite } from '../entities/favorite.entity';
import { EventsService } from '../events/events.service';
import { VendorsService } from '../vendors/vendors.service';
import { ContactConsentService } from '../contact-consent/contact-consent.service';
import {
  RegisterDeviceTokenDto,
  CreateReminderDto,
} from './dto/notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(Announcement)
    private readonly announcementRepository: Repository<Announcement>,
    @InjectRepository(VendorReminder)
    private readonly reminderRepository: Repository<VendorReminder>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    private readonly eventsService: EventsService,
    private readonly vendorsService: VendorsService,
    private readonly contactConsentService: ContactConsentService,
  ) {}

  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto) {
    const existing = await this.deviceTokenRepository.findOne({
      where: { userId, token: dto.token },
    });
    if (existing) {
      return { id: existing.id, message: 'Token already registered' };
    }
    const token = await this.deviceTokenRepository.save(
      this.deviceTokenRepository.create({
        userId,
        token: dto.token,
        platform: dto.platform ?? 'fcm',
      }),
    );
    return { id: token.id, message: 'Device token registered' };
  }

  async revokeDeviceTokens(userId: string, token?: string) {
    if (token) {
      await this.deviceTokenRepository.delete({ userId, token });
      return { message: 'Device token revoked' };
    }
    await this.deviceTokenRepository.delete({ userId });
    return { message: 'All device tokens revoked' };
  }

  async getAnnouncements(eventId: string) {
    await this.eventsService.ensureEvent(eventId);
    const now = new Date();
    const announcements = await this.announcementRepository.find({
      where: { eventId, deletedAt: IsNull() },
      order: { publishedAt: 'DESC' },
    });

    return {
      data: announcements
        .filter(
          (a) =>
            a.publishedAt <= now &&
            (!a.expiresAt || a.expiresAt > now),
        )
        .map((a) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          priority: a.priority,
          publishedAt: a.publishedAt,
        })),
    };
  }

  async getAnnouncement(eventId: string, announcementId: string) {
    await this.eventsService.ensureEvent(eventId);
    const announcement = await this.announcementRepository.findOne({
      where: { id: announcementId, eventId, deletedAt: IsNull() },
    });
    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    const now = new Date();
    if (
      announcement.publishedAt > now ||
      (announcement.expiresAt && announcement.expiresAt <= now)
    ) {
      throw new NotFoundException('Announcement not found');
    }

    return {
      id: announcement.id,
      title: announcement.title,
      body: announcement.body,
      priority: announcement.priority,
      publishedAt: announcement.publishedAt,
      eventId: announcement.eventId,
    };
  }

  async getInbox(userId: string, eventId?: string) {
    const favorites = await this.favoriteRepository.find({
      where: { userId },
    });
    const eventIds = new Set(favorites.map((f) => f.eventId));
    if (eventId) {
      eventIds.add(eventId);
    }

    const pref = await this.preferenceRepository.findOne({ where: { userId } });
    const readIds = new Set(pref?.readNotificationIds ?? []);

    const notifications: Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      eventId: string;
      read: boolean;
      createdAt: Date;
      data?: Record<string, string>;
    }> = [];

    for (const inboxEventId of eventIds) {
      const { data: announcements } = await this.getAnnouncements(inboxEventId);
      for (const a of announcements) {
        notifications.push({
          id: `announcement-${a.id}`,
          type: 'announcement',
          title: a.title,
          body: a.body,
          eventId: inboxEventId,
          read: readIds.has(`announcement-${a.id}`),
          createdAt: a.publishedAt,
          data: {
            announcementId: a.id,
            eventId: inboxEventId,
            priority: a.priority,
          },
        });
      }
    }

    const now = new Date();
    const reminders = await this.reminderRepository.find({
      where: { userId },
      relations: ['vendor'],
      order: { scheduledAt: 'ASC' },
    });
    for (const r of reminders) {
      if (!r.vendor?.isActive) {
        await this.reminderRepository.delete({ id: r.id });
        continue;
      }

      const isUpcoming = !r.isSent && r.scheduledAt > now;
      const isFired = r.isSent;
      if (!isUpcoming && !isFired) continue;

      notifications.push({
        id: `reminder-${r.id}`,
        type: 'reminder',
        title: isFired
          ? `Reminder: ${r.vendor.name}`
          : `Upcoming visit: ${r.vendor.name}`,
        body:
          r.message ??
          (isFired
            ? `Time to visit ${r.vendor.name}`
            : `Scheduled for ${r.scheduledAt.toISOString()}`),
        eventId: r.eventId,
        read: readIds.has(`reminder-${r.id}`),
        createdAt: isFired ? r.scheduledAt : r.scheduledAt,
        data: {
          vendorId: r.vendorId,
          reminderId: r.id,
          eventId: r.eventId,
          status: isFired ? 'fired' : 'scheduled',
        },
      });
    }

    const consentItems = await this.contactConsentService.getInboxItems(userId);
    for (const item of consentItems) {
      notifications.push({
        ...item,
        read: readIds.has(item.id),
      });
    }

    notifications.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );

    return { data: notifications };
  }

  async markRead(userId: string, notificationId: string) {
    let pref = await this.preferenceRepository.findOne({ where: { userId } });
    if (!pref) {
      pref = await this.preferenceRepository.save(
        this.preferenceRepository.create({
          userId,
          readNotificationIds: [],
        }),
      );
    }
    const readIds = new Set(pref.readNotificationIds ?? []);
    readIds.add(notificationId);
    pref.readNotificationIds = [...readIds];
    await this.preferenceRepository.save(pref);
    return { id: notificationId, read: true };
  }

  async createReminder(userId: string, dto: CreateReminderDto) {
    await this.eventsService.ensureEvent(dto.eventId);
    const vendor = await this.vendorsService.ensureVendor(dto.vendorId);
    if (!vendor.isActive) {
      throw new BadRequestException('Vendor is not available');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduled time');
    }
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    const favorite = await this.favoriteRepository.findOne({
      where: { userId, vendorId: dto.vendorId, eventId: dto.eventId },
    });
    if (!favorite) {
      throw new BadRequestException(
        'You can only set reminders for favorited vendors',
      );
    }

    const reminder = await this.reminderRepository.save(
      this.reminderRepository.create({
        userId,
        vendorId: dto.vendorId,
        eventId: dto.eventId,
        scheduledAt,
        message: dto.message ?? null,
      }),
    );

    return {
      id: reminder.id,
      vendorId: reminder.vendorId,
      eventId: reminder.eventId,
      scheduledAt: reminder.scheduledAt,
      message: reminder.message,
    };
  }

  async deleteReminder(userId: string, reminderId: string) {
    const reminder = await this.reminderRepository.findOne({
      where: { id: reminderId, userId },
    });
    if (!reminder) {
      throw new NotFoundException('Reminder not found');
    }
    await this.reminderRepository.delete({ id: reminderId });
    return { id: reminderId, message: 'Reminder cancelled' };
  }

  async cancelRemindersForVendor(vendorId: string) {
    const result = await this.reminderRepository.delete({ vendorId });
    return { cancelled: result.affected ?? 0 };
  }

  async listReminders(userId: string) {
    const reminders = await this.reminderRepository.find({
      where: { userId },
      relations: ['vendor'],
      order: { scheduledAt: 'ASC' },
    });
    return {
      data: reminders.map((r) => ({
        id: r.id,
        vendorId: r.vendorId,
        eventId: r.eventId,
        scheduledAt: r.scheduledAt,
        message: r.message,
        isSent: r.isSent,
        vendor: { id: r.vendor.id, name: r.vendor.name },
      })),
    };
  }
}
