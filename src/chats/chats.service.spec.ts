import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ChatsService } from './chats.service';
import { Conversation } from '../entities/conversation.entity';
import { Message } from '../entities/message.entity';
import { ConversationRead } from '../entities/conversation-read.entity';
import { ChatReport } from '../entities/chat-report.entity';
import { User } from '../entities/user.entity';
import { EventsService } from '../events/events.service';
import { VendorsService } from '../vendors/vendors.service';
import { MediaService } from '../media/media.service';
import { PushDeliveryService } from '../notifications/push-delivery.service';
import {
  ChatReportReason,
  ChatReportStatus,
  ChatSenderRole,
  MessageType,
  UserRole,
} from '../common/enums';

describe('ChatsService', () => {
  let service: ChatsService;

  const visitor = {
    id: 'visitor-1',
    role: UserRole.VISITOR,
    displayName: 'Jane Doe',
  } as User;

  const vendorUser = {
    id: 'vendor-user-1',
    role: UserRole.VENDOR,
    vendorId: 'vendor-1',
  } as User;

  const conversationTemplate = {
    id: 'conv-1',
    eventId: 'event-1',
    vendorId: 'vendor-1',
    visitorId: 'visitor-1',
    visitorDeletedAt: null,
    vendorDeletedAt: null,
    lastMessageAt: null,
    lastMessagePreview: null,
    lastMessageSenderRole: null,
    createdAt: new Date('2026-08-08T20:00:00.000Z'),
    vendor: {
      id: 'vendor-1',
      name: 'Kilimanjaro',
      logoUrl: '/media/catalogue/logo.jpg',
      boothNumber: 'A12',
    },
    visitor: {
      id: 'visitor-1',
      displayName: 'Jane Doe',
    },
  } as Conversation;

  const createConversation = (
    overrides: Partial<Conversation> = {},
  ): Conversation => ({
    ...conversationTemplate,
    vendor: { ...conversationTemplate.vendor },
    visitor: { ...conversationTemplate.visitor },
    ...overrides,
  });

  const mockConversationRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto: Partial<Conversation>) => dto),
    save: jest.fn((dto: Partial<Conversation>) =>
      Promise.resolve({ id: 'conv-1', ...dto }),
    ),
    createQueryBuilder: jest.fn(),
  };

  const mockMessageRepo = {
    findAndCount: jest.fn(),
    create: jest.fn((dto: Partial<Message>) => dto),
    save: jest.fn((dto: Partial<Message>) =>
      Promise.resolve({
        id: 'msg-1',
        createdAt: new Date('2026-08-08T21:00:00.000Z'),
        ...dto,
      }),
    ),
    createQueryBuilder: jest.fn(),
  };

  const mockReadRepo = {
    findOne: jest.fn(),
    create: jest.fn((dto: Partial<ConversationRead>) => dto),
    save: jest.fn((dto: Partial<ConversationRead>) =>
      Promise.resolve({ id: 'read-1', ...dto }),
    ),
  };

  const mockChatReportRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto: Partial<ChatReport>) => dto),
    save: jest.fn((dto: Partial<ChatReport>) =>
      Promise.resolve({ id: 'report-1', ...dto }),
    ),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockEventsService = {
    ensureEvent: jest.fn(),
  };

  const mockVendorsService = {
    ensureVendor: jest.fn(),
  };

  const mockMediaService = {
    saveChatImage: jest.fn(),
    toPublicUrl: jest.fn((url?: string | null) =>
      url ? `https://api.example.com${url}` : null,
    ),
  };

  const mockPushDeliveryService = {
    dispatchChatMessage: jest.fn(),
  };

  const mockUnreadQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(0),
  };

  const mockListQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getCount: jest.fn().mockResolvedValue(1),
    getMany: jest.fn().mockResolvedValue([createConversation()]),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockMessageRepo.createQueryBuilder.mockReturnValue(mockUnreadQueryBuilder);
    mockConversationRepo.createQueryBuilder.mockReturnValue(
      mockListQueryBuilder,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatsService,
        {
          provide: getRepositoryToken(Conversation),
          useValue: mockConversationRepo,
        },
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        {
          provide: getRepositoryToken(ConversationRead),
          useValue: mockReadRepo,
        },
        {
          provide: getRepositoryToken(ChatReport),
          useValue: mockChatReportRepo,
        },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: EventsService, useValue: mockEventsService },
        { provide: VendorsService, useValue: mockVendorsService },
        { provide: MediaService, useValue: mockMediaService },
        {
          provide: PushDeliveryService,
          useValue: mockPushDeliveryService,
        },
      ],
    }).compile();

    service = module.get(ChatsService);
  });

  it('creates a new conversation for a visitor', async () => {
    mockVendorsService.ensureVendor.mockResolvedValue({
      id: 'vendor-1',
      eventId: 'event-1',
    });
    mockConversationRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createConversation());

    const result = await service.createConversation(visitor, {
      vendorId: 'vendor-1',
      eventId: 'event-1',
    });

    expect(result.id).toBe('conv-1');
    expect(result.vendor?.name).toBe('Kilimanjaro');
    expect(mockConversationRepo.save).toHaveBeenCalled();
  });

  it('reopens an existing conversation for the visitor', async () => {
    mockVendorsService.ensureVendor.mockResolvedValue({
      id: 'vendor-1',
      eventId: 'event-1',
    });
    mockConversationRepo.findOne.mockResolvedValue(
      createConversation({ visitorDeletedAt: new Date() }),
    );

    await service.createConversation(visitor, {
      vendorId: 'vendor-1',
      eventId: 'event-1',
    });

    expect(mockConversationRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ visitorDeletedAt: null }),
    );
  });

  it('lists conversations for a visitor with pagination metadata', async () => {
    const result = await service.listConversations(
      visitor,
      'visitor',
      'event-1',
      'kilimanjaro',
      1,
      20,
    );

    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
    expect(mockConversationRepo.createQueryBuilder).toHaveBeenCalled();
  });

  it('rejects empty text messages', async () => {
    mockConversationRepo.findOne.mockResolvedValue(createConversation());

    await expect(
      service.sendTextMessage(visitor, 'visitor', 'conv-1', '   '),
    ).rejects.toThrow(BadRequestException);
  });

  it('sends a text message and queues push delivery', async () => {
    mockConversationRepo.findOne.mockResolvedValue(createConversation());
    mockReadRepo.findOne.mockResolvedValue(null);
    mockUserRepo.findOne.mockResolvedValue({ id: 'vendor-user-1' });

    const result = await service.sendTextMessage(
      visitor,
      'visitor',
      'conv-1',
      'Hello vendor',
    );

    expect(result.body).toBe('Hello vendor');
    expect(result.senderRole).toBe(ChatSenderRole.VISITOR);
    expect(mockPushDeliveryService.dispatchChatMessage).toHaveBeenCalled();
  });

  it('sends an image message using chat media storage', async () => {
    mockConversationRepo.findOne.mockResolvedValue(createConversation());
    mockReadRepo.findOne.mockResolvedValue(null);
    mockMediaService.saveChatImage.mockReturnValue({
      imageUrl: '/media/chat/photo.jpg',
      mimeType: 'image/jpeg',
    });

    const result = await service.sendImageMessage(
      vendorUser,
      'vendor',
      'conv-1',
      { originalname: 'photo.jpg' } as Express.Multer.File,
    );

    expect(result.type).toBe(MessageType.IMAGE);
    expect(result.mediaUrl).toBe(
      'https://api.example.com/media/chat/photo.jpg',
    );
    expect(mockMediaService.saveChatImage).toHaveBeenCalled();
  });

  it('marks a conversation as read', async () => {
    mockConversationRepo.findOne.mockResolvedValue(createConversation());
    mockReadRepo.findOne.mockResolvedValue(null);

    const result = await service.markRead(visitor, 'visitor', 'conv-1');

    expect(result).toEqual({ conversationId: 'conv-1', read: true });
    expect(mockReadRepo.save).toHaveBeenCalled();
  });

  it('soft-deletes a conversation for the visitor', async () => {
    mockConversationRepo.findOne.mockResolvedValue(createConversation());

    const result = await service.deleteConversation(
      visitor,
      'visitor',
      'conv-1',
    );

    expect(result.message).toBe('Chat deleted');
    const savedConversation = mockConversationRepo.save.mock
      .calls[0][0] as Conversation;
    expect(savedConversation.visitorDeletedAt).toBeInstanceOf(Date);
  });

  it('rejects duplicate chat reports from the same visitor', async () => {
    mockConversationRepo.findOne.mockResolvedValue(createConversation());
    mockChatReportRepo.findOne.mockResolvedValue({ id: 'report-1' });

    await expect(
      service.reportConversation(visitor, 'conv-1', {
        reason: ChatReportReason.HARASSMENT,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a chat report for a visitor', async () => {
    mockConversationRepo.findOne.mockResolvedValue(createConversation());
    mockChatReportRepo.findOne.mockResolvedValue(null);

    const result = await service.reportConversation(visitor, 'conv-1', {
      reason: ChatReportReason.SCAM,
    });

    expect(result.reason).toBe(ChatReportReason.SCAM);
    expect(result.message).toBe('Thank you for reporting');
  });

  it('lists chat reports for an event', async () => {
    mockChatReportRepo.find.mockResolvedValue([
      {
        id: 'report-1',
        conversationId: 'conv-1',
        eventId: 'event-1',
        reason: ChatReportReason.HARASSMENT,
        status: ChatReportStatus.PENDING,
        createdAt: new Date('2026-08-08T21:10:00.000Z'),
        vendor: { id: 'vendor-1', name: 'Kilimanjaro' },
        reporter: { id: 'visitor-1', displayName: 'Jane Doe' },
      },
    ]);

    const result = await service.listChatReports('event-1');

    expect(result.data).toHaveLength(1);
    expect(result.data[0].vendor?.name).toBe('Kilimanjaro');
    expect(mockEventsService.ensureEvent).toHaveBeenCalledWith('event-1');
  });

  it('updates a chat report status', async () => {
    mockChatReportRepo.findOne.mockResolvedValue({
      id: 'report-1',
      status: ChatReportStatus.PENDING,
    });

    const result = await service.updateChatReport('report-1', {
      status: ChatReportStatus.REVIEWED,
    });

    expect(result.status).toBe(ChatReportStatus.REVIEWED);
  });

  it('throws when updating a missing chat report', async () => {
    mockChatReportRepo.findOne.mockResolvedValue(null);

    await expect(
      service.updateChatReport('missing', {
        status: ChatReportStatus.REVIEWED,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('denies access when a visitor requests another users conversation', async () => {
    mockConversationRepo.findOne.mockResolvedValue(
      createConversation({ visitorId: 'other-visitor' }),
    );

    await expect(
      service.getConversation(visitor, 'visitor', 'conv-1'),
    ).rejects.toThrow(ForbiddenException);
  });
});
