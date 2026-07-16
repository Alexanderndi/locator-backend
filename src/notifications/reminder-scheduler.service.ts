import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VendorReminder } from '../entities/vendor-reminder.entity';
import { PushDeliveryService } from './push-delivery.service';

@Injectable()
export class ReminderSchedulerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ReminderSchedulerService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(VendorReminder)
    private readonly reminderRepository: Repository<VendorReminder>,
    private readonly pushDeliveryService: PushDeliveryService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      void this.processDueReminders();
    }, 30_000);
    void this.processDueReminders();
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async processDueReminders() {
    const now = new Date();
    const reminders = await this.reminderRepository.find({
      where: { isSent: false },
      relations: ['vendor'],
    });

    for (const reminder of reminders) {
      if (reminder.scheduledAt > now) continue;

      if (!reminder.vendor?.isActive) {
        await this.reminderRepository.delete({ id: reminder.id });
        this.logger.log(`Cancelled reminder ${reminder.id} — vendor inactive`);
        continue;
      }

      reminder.isSent = true;
      await this.reminderRepository.save(reminder);
      await this.pushDeliveryService.dispatchReminder(
        reminder,
        reminder.vendor.name,
      );
      this.logger.log(
        `Fired reminder ${reminder.id} for vendor ${reminder.vendor.name}`,
      );
    }
  }
}
