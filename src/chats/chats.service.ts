import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, IsNull, Repository } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { ConversationRead } from '../entities/conversation-read.entity';
import { ChatReport } from '../entities/chat-report.entity';
import { User } from '../entities/user.entity';
import {
  ChatReportStatus,
  ChatSenderRole,
  MessageType,
  UserRole,
} from '../common/enums';
import { ContactConsentService } from '../contact-consent/contact-consent.service';
import { EventsService } from '../events/events.service';
import { VendorsService } from '../vendors/vendors.service';
import { MediaService } from '../media/media.service';
import { PushDeliveryService } from '../notifications/push-delivery.service';
import {
  BulkConversationIdsDto,
  CreateConversationDto,
  ReportChatDto,
  UpdateChatReportDto,
} from './dto/chat.dto';

type ParticipantRole = 'visitor' | 'vendor';

@Injectable()
export class ChatsService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    @InjectRepository(ConversationRead)
    private readonly readRepository: Repository<ConversationRead>,
    @InjectRepository(ChatReport)
    private readonly chatReportRepository: Repository<ChatReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly contactConsentService: ContactConsentService,
    private readonly eventsService: EventsService,
    private readonly vendorsService: VendorsService,
    private readonly mediaService: MediaService,
    private readonly pushDeliveryService: PushDeliveryService,
  ) {}

  async listConversations(
    user: User,
    role: ParticipantRole,
    eventId?: string,
    q?: string,
    page = 1,
    pageSize = 20,
  ) {
    const qb = this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.vendor', 'vendor')
      .leftJoinAndSelect('conversation.visitor', 'visitor')
      .orderBy('conversation.lastMessageAt', 'DESC')
      .addOrderBy('conversation.createdAt', 'DESC');

    if (role === 'visitor') {
      qb.where('conversation.visitorId = :userId', {
        userId: user.id,
      }).andWhere('conversation.visitorDeletedAt IS NULL');
    } else {
      const vendorId = this.requireVendorId(user);
      qb.where('conversation.vendorId = :vendorId', { vendorId }).andWhere(
        'conversation.vendorDeletedAt IS NULL',
      );
    }

    if (eventId) {
      qb.andWhere('conversation.eventId = :eventId', { eventId });
    }

    if (q?.trim()) {
      const term = `%${q.trim().toLowerCase()}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where('LOWER(vendor.name) LIKE :term', { term })
            .orWhere('LOWER(visitor.displayName) LIKE :term', { term })
            .orWhere('LOWER(conversation.lastMessagePreview) LIKE :term', {
              term,
            });
        }),
      );
    }

    const total = await qb.getCount();
    const conversations = await qb
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    const data = await Promise.all(
      conversations.map((conversation) =>
        this.formatConversationSummary(conversation, user.id, role),
      ),
    );

    return {
      data,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async createConversation(user: User, dto: CreateConversationDto) {
    if (user.role !== UserRole.VISITOR) {
      throw new ForbiddenException('Only visitors can start conversations');
    }

    await this.eventsService.ensureEvent(dto.eventId);
    const vendor = await this.vendorsService.ensureVendor(dto.vendorId);
    if (vendor.eventId !== dto.eventId) {
      throw new BadRequestException('Vendor does not belong to this event');
    }

    const consent = await this.contactConsentService.findAcceptedConsent(
      user.id,
      dto.vendorId,
      dto.eventId,
    );
    if (!consent) {
      throw new ForbiddenException(
        'Contact consent must be accepted before chatting with this vendor',
      );
    }

    let conversation = await this.conversationRepository.findOne({
      where: {
        visitorId: user.id,
        vendorId: dto.vendorId,
        eventId: dto.eventId,
      },
      relations: ['vendor', 'visitor'],
    });

    if (conversation) {
      conversation.visitorDeletedAt = null;
      await this.conversationRepository.save(conversation);
    } else {
      conversation = await this.conversationRepository.save(
        this.conversationRepository.create({
          visitorId: user.id,
          vendorId: dto.vendorId,
          eventId: dto.eventId,
        }),
      );
      conversation = (await this.conversationRepository.findOne({
        where: { id: conversation.id },
        relations: ['vendor', 'visitor'],
      }))!;
    }

    return this.formatConversationSummary(conversation, user.id, 'visitor');
  }

  async getConversation(
    user: User,
    role: ParticipantRole,
    conversationId: string,
  ) {
    const conversation = await this.getConversationForParticipant(
      user,
      role,
      conversationId,
    );
    return this.formatConversationSummary(conversation, user.id, role);
  }

  async listMessages(
    user: User,
    role: ParticipantRole,
    conversationId: string,
    page = 1,
    pageSize = 50,
  ) {
    await this.getConversationForParticipant(user, role, conversationId);

    const [messages, total] = await this.messageRepository.findAndCount({
      where: { conversationId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      data: messages.reverse().map((message) => this.formatMessage(message)),
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
    };
  }

  async sendTextMessage(
    user: User,
    role: ParticipantRole,
    conversationId: string,
    body: string,
  ) {
    const conversation = await this.getConversationForParticipant(
      user,
      role,
      conversationId,
    );
    const trimmed = body.trim();
    if (!trimmed) {
      throw new BadRequestException('Message body cannot be empty');
    }

    const message = await this.persistMessage(conversation, user, role, {
      type: MessageType.TEXT,
      body: trimmed,
    });

    await this.notifyRecipient(conversation, user.id, role, trimmed);
    return this.formatMessage(message);
  }

  async sendImageMessage(
    user: User,
    role: ParticipantRole,
    conversationId: string,
    file: Express.Multer.File,
  ) {
    const conversation = await this.getConversationForParticipant(
      user,
      role,
      conversationId,
    );
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    const saved = this.mediaService.saveChatImage(file);
    const message = await this.persistMessage(conversation, user, role, {
      type: MessageType.IMAGE,
      body: null,
      mediaUrl: saved.imageUrl,
      mimeType: saved.mimeType,
    });

    await this.notifyRecipient(conversation, user.id, role, 'Photo');
    return this.formatMessage(message);
  }

  async markRead(user: User, role: ParticipantRole, conversationId: string) {
    await this.getConversationForParticipant(user, role, conversationId);
    await this.upsertReadState(conversationId, user.id, new Date());
    return { conversationId, read: true };
  }

  async markAllRead(user: User, role: ParticipantRole, eventId?: string) {
    const conversations = await this.listParticipantConversations(
      user,
      role,
      eventId,
    );
    const now = new Date();
    for (const conversation of conversations) {
      await this.upsertReadState(conversation.id, user.id, now);
    }
    return { updated: conversations.length };
  }

  async bulkRead(
    user: User,
    role: ParticipantRole,
    dto: BulkConversationIdsDto,
  ) {
    const now = new Date();
    let updated = 0;
    for (const conversationId of dto.conversationIds) {
      await this.getConversationForParticipant(user, role, conversationId);
      await this.upsertReadState(conversationId, user.id, now);
      updated++;
    }
    return { updated };
  }

  async deleteConversation(
    user: User,
    role: ParticipantRole,
    conversationId: string,
  ) {
    const conversation = await this.getConversationForParticipant(
      user,
      role,
      conversationId,
      { includeDeleted: true },
    );

    if (role === 'visitor') {
      conversation.visitorDeletedAt = new Date();
    } else {
      conversation.vendorDeletedAt = new Date();
    }
    await this.conversationRepository.save(conversation);
    return { conversationId, message: 'Chat deleted' };
  }

  async bulkDelete(
    user: User,
    role: ParticipantRole,
    dto: BulkConversationIdsDto,
  ) {
    let deleted = 0;
    for (const conversationId of dto.conversationIds) {
      await this.deleteConversation(user, role, conversationId);
      deleted++;
    }
    return { deleted };
  }

  async reportConversation(
    user: User,
    conversationId: string,
    dto: ReportChatDto,
  ) {
    if (user.role !== UserRole.VISITOR) {
      throw new ForbiddenException('Only visitors can report chats');
    }

    const conversation = await this.getConversationForParticipant(
      user,
      'visitor',
      conversationId,
    );

    const existing = await this.chatReportRepository.findOne({
      where: {
        conversationId,
        reporterId: user.id,
        status: ChatReportStatus.PENDING,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'You have already reported this conversation',
      );
    }

    const report = await this.chatReportRepository.save(
      this.chatReportRepository.create({
        conversationId,
        eventId: conversation.eventId,
        vendorId: conversation.vendorId,
        reporterId: user.id,
        reason: dto.reason,
        status: ChatReportStatus.PENDING,
      }),
    );

    return {
      id: report.id,
      conversationId: report.conversationId,
      reason: report.reason,
      status: report.status,
      message: 'Thank you for reporting',
    };
  }

  async listChatReports(eventId: string) {
    await this.eventsService.ensureEvent(eventId);
    const reports = await this.chatReportRepository.find({
      where: { eventId },
      relations: ['vendor', 'reporter'],
      order: { createdAt: 'DESC' },
    });

    return {
      data: reports.map((report) => ({
        id: report.id,
        conversationId: report.conversationId,
        eventId: report.eventId,
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt,
        vendor: report.vendor
          ? { id: report.vendor.id, name: report.vendor.name }
          : null,
        reporter: report.reporter
          ? {
              id: report.reporter.id,
              displayName: report.reporter.displayName,
            }
          : null,
      })),
    };
  }

  async updateChatReport(reportId: string, dto: UpdateChatReportDto) {
    const report = await this.chatReportRepository.findOne({
      where: { id: reportId },
    });
    if (!report) {
      throw new NotFoundException('Chat report not found');
    }

    report.status = dto.status;
    await this.chatReportRepository.save(report);

    return {
      id: report.id,
      status: report.status,
    };
  }

  private async persistMessage(
    conversation: Conversation,
    user: User,
    role: ParticipantRole,
    payload: {
      type: MessageType;
      body: string | null;
      mediaUrl?: string | null;
      mimeType?: string | null;
    },
  ) {
    const now = new Date();
    const preview =
      payload.type === MessageType.IMAGE
        ? 'Photo'
        : this.truncatePreview(payload.body ?? '');

    const message = await this.messageRepository.save(
      this.messageRepository.create({
        conversationId: conversation.id,
        senderId: user.id,
        senderRole:
          role === 'visitor' ? ChatSenderRole.VISITOR : ChatSenderRole.VENDOR,
        type: payload.type,
        body: payload.body,
        mediaUrl: payload.mediaUrl ?? null,
        mimeType: payload.mimeType ?? null,
      }),
    );

    conversation.lastMessageAt = now;
    conversation.lastMessagePreview = preview;
    conversation.lastMessageSenderRole =
      role === 'visitor' ? ChatSenderRole.VISITOR : ChatSenderRole.VENDOR;
    conversation.visitorDeletedAt = null;
    conversation.vendorDeletedAt = null;
    await this.conversationRepository.save(conversation);
    await this.upsertReadState(conversation.id, user.id, now);

    return message;
  }

  private async notifyRecipient(
    conversation: Conversation,
    senderUserId: string,
    senderRole: ParticipantRole,
    preview: string,
  ) {
    const recipientUserId =
      senderRole === 'visitor'
        ? await this.resolveVendorUserId(conversation.vendorId)
        : conversation.visitorId;

    if (!recipientUserId || recipientUserId === senderUserId) {
      return;
    }

    const vendorName =
      conversation.vendor?.name ??
      (await this.vendorsService.ensureVendor(conversation.vendorId)).name;

    await this.pushDeliveryService.dispatchChatMessage({
      userId: recipientUserId,
      conversationId: conversation.id,
      vendorName,
      preview,
    });
  }

  private async resolveVendorUserId(vendorId: string): Promise<string | null> {
    const vendorUser = await this.userRepository.findOne({
      where: { vendorId, role: UserRole.VENDOR },
    });
    return vendorUser?.id ?? null;
  }

  private async getConversationForParticipant(
    user: User,
    role: ParticipantRole,
    conversationId: string,
    options: { includeDeleted?: boolean } = {},
  ): Promise<Conversation> {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: ['vendor', 'visitor'],
    });
    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (role === 'visitor') {
      if (conversation.visitorId !== user.id) {
        throw new ForbiddenException('You do not have access to this chat');
      }
      if (!options.includeDeleted && conversation.visitorDeletedAt) {
        throw new NotFoundException('Conversation not found');
      }
    } else {
      const vendorId = this.requireVendorId(user);
      if (conversation.vendorId !== vendorId) {
        throw new ForbiddenException('You do not have access to this chat');
      }
      if (!options.includeDeleted && conversation.vendorDeletedAt) {
        throw new NotFoundException('Conversation not found');
      }
    }

    return conversation;
  }

  private async listParticipantConversations(
    user: User,
    role: ParticipantRole,
    eventId?: string,
  ) {
    const where =
      role === 'visitor'
        ? {
            visitorId: user.id,
            visitorDeletedAt: IsNull(),
            ...(eventId ? { eventId } : {}),
          }
        : {
            vendorId: this.requireVendorId(user),
            vendorDeletedAt: IsNull(),
            ...(eventId ? { eventId } : {}),
          };

    return this.conversationRepository.find({ where });
  }

  private async upsertReadState(
    conversationId: string,
    userId: string,
    lastReadAt: Date,
  ) {
    const existing = await this.readRepository.findOne({
      where: { conversationId, userId },
    });
    if (existing) {
      existing.lastReadAt = lastReadAt;
      await this.readRepository.save(existing);
      return existing;
    }

    return this.readRepository.save(
      this.readRepository.create({ conversationId, userId, lastReadAt }),
    );
  }

  private async getUnreadCount(conversationId: string, userId: string) {
    const read = await this.readRepository.findOne({
      where: { conversationId, userId },
    });
    const lastReadAt = read?.lastReadAt ?? new Date(0);
    return this.messageRepository
      .createQueryBuilder('message')
      .where('message.conversationId = :conversationId', { conversationId })
      .andWhere('message.senderId != :userId', { userId })
      .andWhere('message.createdAt > :lastReadAt', { lastReadAt })
      .getCount();
  }

  private requireVendorId(user: User): string {
    if (user.role !== UserRole.VENDOR || !user.vendorId) {
      throw new ForbiddenException('Vendor account required');
    }
    return user.vendorId;
  }

  private truncatePreview(body: string): string {
    const trimmed = body.trim().replace(/\s+/g, ' ');
    if (trimmed.length <= 120) return trimmed;
    return `${trimmed.slice(0, 119)}…`;
  }

  private async formatConversationSummary(
    conversation: Conversation,
    userId: string,
    role: ParticipantRole,
  ) {
    const unreadCount = await this.getUnreadCount(conversation.id, userId);
    return {
      id: conversation.id,
      eventId: conversation.eventId,
      vendor: conversation.vendor
        ? {
            id: conversation.vendor.id,
            name: conversation.vendor.name,
            logoUrl: this.mediaService.toPublicUrl(conversation.vendor.logoUrl),
            boothNumber: conversation.vendor.boothNumber,
            isOnline: false,
          }
        : null,
      visitor:
        role === 'vendor' && conversation.visitor
          ? {
              id: conversation.visitor.id,
              displayName: conversation.visitor.displayName,
            }
          : undefined,
      lastMessage: conversation.lastMessageAt
        ? {
            preview: conversation.lastMessagePreview,
            sentAt: conversation.lastMessageAt,
            senderRole: conversation.lastMessageSenderRole,
          }
        : null,
      unreadCount,
      createdAt: conversation.createdAt,
    };
  }

  private formatMessage(message: Message) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderRole: message.senderRole,
      type: message.type,
      body: message.body,
      mediaUrl: this.mediaService.toPublicUrl(message.mediaUrl),
      mimeType: message.mimeType,
      createdAt: message.createdAt,
    };
  }
}
