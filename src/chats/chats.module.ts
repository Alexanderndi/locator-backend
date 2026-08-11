import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatsController } from './chats.controller';
import { VendorChatsController } from './vendor-chats.controller';
import { ChatReportsAdminController } from './chat-reports-admin.controller';
import { ChatsService } from './chats.service';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { ConversationRead } from '../entities/conversation-read.entity';
import { ChatReport } from '../entities/chat-report.entity';
import { User } from '../entities/user.entity';
import { EventsModule } from '../events/events.module';
import { VendorsModule } from '../vendors/vendors.module';
import { MediaModule } from '../media/media.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      ConversationRead,
      ChatReport,
      User,
    ]),
    EventsModule,
    VendorsModule,
    MediaModule,
    NotificationsModule,
  ],
  controllers: [
    ChatsController,
    VendorChatsController,
    ChatReportsAdminController,
  ],
  providers: [ChatsService],
  exports: [ChatsService],
})
export class ChatsModule {}
