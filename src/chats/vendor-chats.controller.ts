import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '../common/enums';
import { User } from '../entities/user.entity';
import {
  BulkConversationIdsDto,
  ChatListQueryDto,
  MarkAllReadQueryDto,
  MessagesQueryDto,
  SendMessageDto,
} from './dto/chat.dto';

@Controller('vendor-portal/chats')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: ChatListQueryDto) {
    return this.chatsService.listConversations(
      user,
      'vendor',
      query.eventId,
      query.q,
      query.page,
      query.pageSize,
    );
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: User, @Query() query: MarkAllReadQueryDto) {
    return this.chatsService.markAllRead(user, 'vendor', query.eventId);
  }

  @Post('bulk-read')
  bulkRead(@CurrentUser() user: User, @Body() dto: BulkConversationIdsDto) {
    return this.chatsService.bulkRead(user, 'vendor', dto);
  }

  @Post('bulk-delete')
  bulkDelete(@CurrentUser() user: User, @Body() dto: BulkConversationIdsDto) {
    return this.chatsService.bulkDelete(user, 'vendor', dto);
  }

  @Get(':conversationId')
  getOne(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatsService.getConversation(user, 'vendor', conversationId);
  }

  @Get(':conversationId/messages')
  listMessages(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.chatsService.listMessages(
      user,
      'vendor',
      conversationId,
      query.page,
      query.pageSize,
    );
  }

  @Post(':conversationId/messages')
  sendMessage(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatsService.sendTextMessage(
      user,
      'vendor',
      conversationId,
      dto.body,
    );
  }

  @Post(':conversationId/messages/media')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
    }),
  )
  sendImage(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.chatsService.sendImageMessage(
      user,
      'vendor',
      conversationId,
      file,
    );
  }

  @Patch(':conversationId/read')
  markRead(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatsService.markRead(user, 'vendor', conversationId);
  }

  @Delete(':conversationId')
  delete(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatsService.deleteConversation(user, 'vendor', conversationId);
  }
}
