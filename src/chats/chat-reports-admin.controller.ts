import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ChatsService } from './chats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums';
import { UpdateChatReportDto } from './dto/chat.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.ORGANIZER)
export class ChatReportsAdminController {
  constructor(private readonly chatsService: ChatsService) {}

  @Get('events/:eventId/chat-reports')
  listReports(@Param('eventId') eventId: string) {
    return this.chatsService.listChatReports(eventId);
  }

  @Patch('chat-reports/:reportId')
  updateReport(
    @Param('reportId') reportId: string,
    @Body() dto: UpdateChatReportDto,
  ) {
    return this.chatsService.updateChatReport(reportId, dto);
  }
}
