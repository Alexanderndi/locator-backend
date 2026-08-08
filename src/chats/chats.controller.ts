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
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import {
  BulkConversationIdsDto,
  ChatListQueryDto,
  CreateConversationDto,
  MarkAllReadQueryDto,
  MessagesQueryDto,
  ReportChatDto,
  SendMessageDto,
} from './dto/chat.dto';

@Controller('users/me/chats')
@UseGuards(JwtAuthGuard)
export class ChatsController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get()
  list(@CurrentUser() user: User, @Query() query: ChatListQueryDto) {
    return this.chatsService.listConversations(
      user,
      'visitor',
      query.eventId,
      query.q,
      query.page,
      query.pageSize,
    );
  }

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateConversationDto) {
    return this.chatsService.createConversation(user, dto);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: User, @Query() query: MarkAllReadQueryDto) {
    return this.chatsService.markAllRead(user, 'visitor', query.eventId);
  }

  @Post('bulk-read')
  bulkRead(@CurrentUser() user: User, @Body() dto: BulkConversationIdsDto) {
    return this.chatsService.bulkRead(user, 'visitor', dto);
  }

  @Post('bulk-delete')
  bulkDelete(@CurrentUser() user: User, @Body() dto: BulkConversationIdsDto) {
    return this.chatsService.bulkDelete(user, 'visitor', dto);
  }

  @Get(':conversationId')
  getOne(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatsService.getConversation(user, 'visitor', conversationId);
  }

  @Get(':conversationId/messages')
  listMessages(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Query() query: MessagesQueryDto,
  ) {
    return this.chatsService.listMessages(
      user,
      'visitor',
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
      'visitor',
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
      'visitor',
      conversationId,
      file,
    );
  }

  @Patch(':conversationId/read')
  markRead(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatsService.markRead(user, 'visitor', conversationId);
  }

  @Delete(':conversationId')
  delete(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
  ) {
    return this.chatsService.deleteConversation(
      user,
      'visitor',
      conversationId,
    );
  }

  @Post(':conversationId/report')
  report(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() dto: ReportChatDto,
  ) {
    return this.chatsService.reportConversation(user, conversationId, dto);
  }
}
