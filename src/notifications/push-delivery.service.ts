import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeviceToken } from '../entities/device-token.entity';
import { UserPreference } from '../entities/user-preference.entity';
import { Announcement } from '../entities/announcement.entity';
import { VendorReminder } from '../entities/vendor-reminder.entity';
import { AnnouncementPriority } from '../common/enums';

@Injectable()
export class PushDeliveryService {
  private readonly logger = new Logger(PushDeliveryService.name);

  constructor(
    @InjectRepository(DeviceToken)
    private readonly deviceTokenRepository: Repository<DeviceToken>,
    @InjectRepository(UserPreference)
    private readonly preferenceRepository: Repository<UserPreference>,
  ) {}

  async dispatchAnnouncement(announcement: Announcement) {
    const tokens = await this.deviceTokenRepository.find();
    if (tokens.length === 0) {
      return { queued: 0, skipped: 0 };
    }

    const preferences = await this.preferenceRepository.find();
    const prefByUser = new Map(preferences.map((p) => [p.userId, p]));

    const summary = this.summarize(announcement.body);
    let queued = 0;
    let skipped = 0;

    for (const token of tokens) {
      const pref = prefByUser.get(token.userId);
      const pushEnabled = pref?.pushEnabled ?? true;
      const isEmergency =
        announcement.priority === AnnouncementPriority.EMERGENCY;

      if (!pushEnabled && !isEmergency) {
        skipped++;
        continue;
      }

      this.logger.log(
        `Push queued: user=${token.userId} platform=${token.platform} ` +
          `priority=${announcement.priority} title="${announcement.title}"`,
      );

      queued++;
    }

    return {
      queued,
      skipped,
      announcementId: announcement.id,
      eventId: announcement.eventId,
      title: announcement.title,
      summary,
      priority: announcement.priority,
    };
  }

  async dispatchReminder(reminder: VendorReminder, vendorName: string) {
    const tokens = await this.deviceTokenRepository.find({
      where: { userId: reminder.userId },
    });
    if (tokens.length === 0) {
      return { queued: 0, skipped: 0 };
    }

    const pref = await this.preferenceRepository.findOne({
      where: { userId: reminder.userId },
    });
    const pushEnabled = pref?.pushEnabled ?? true;
    let queued = 0;
    let skipped = 0;

    const body =
      reminder.message?.trim() || `Time to visit ${vendorName} at the event`;

    for (const token of tokens) {
      if (!pushEnabled) {
        skipped++;
        continue;
      }

      this.logger.log(
        `Reminder push queued: user=${token.userId} vendor=${vendorName} ` +
          `reminder=${reminder.id}`,
      );
      queued++;
    }

    return {
      queued,
      skipped,
      reminderId: reminder.id,
      vendorId: reminder.vendorId,
      eventId: reminder.eventId,
      title: `Reminder: ${vendorName}`,
      body,
    };
  }

  async dispatchChatMessage(params: {
    userId: string;
    conversationId: string;
    vendorName: string;
    preview: string;
  }) {
    const tokens = await this.deviceTokenRepository.find({
      where: { userId: params.userId },
    });
    if (tokens.length === 0) {
      return { queued: 0, skipped: 0 };
    }

    const pref = await this.preferenceRepository.findOne({
      where: { userId: params.userId },
    });
    const pushEnabled = pref?.pushEnabled ?? true;
    let queued = 0;
    let skipped = 0;

    for (const token of tokens) {
      if (!pushEnabled) {
        skipped++;
        continue;
      }

      this.logger.log(
        `Chat push queued: user=${params.userId} conversation=${params.conversationId} ` +
          `platform=${token.platform}`,
      );
      queued++;
    }

    return {
      queued,
      skipped,
      conversationId: params.conversationId,
      title: params.vendorName,
      body: this.summarize(params.preview, 120),
    };
  }

  private summarize(body: string, maxLength = 120): string {
    const trimmed = body.trim().replace(/\s+/g, ' ');
    if (trimmed.length <= maxLength) return trimmed;
    return `${trimmed.substring(0, maxLength - 1)}…`;
  }
}
