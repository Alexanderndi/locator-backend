import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatReportReason, ChatReportStatus } from '../../common/enums';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

export class CreateConversationDto {
  @IsUUID()
  vendorId: string;

  @IsUUID()
  eventId: string;
}

export class ChatListQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  q?: string;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  body: string;
}

export class BulkConversationIdsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  conversationIds: string[];
}

export class ReportChatDto {
  @IsEnum(ChatReportReason)
  reason: ChatReportReason;
}

export class UpdateChatReportDto {
  @IsEnum(ChatReportStatus)
  status: ChatReportStatus;
}

export class MarkAllReadQueryDto {
  @IsOptional()
  @IsUUID()
  eventId?: string;
}

export class MessagesQueryDto {
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  pageSize?: number = 50;
}
