import { ChatsController } from './chats.controller';
import { ChatsService } from './chats.service';
import { User } from '../entities/user.entity';
import { ChatReportReason } from '../common/enums';

describe('ChatsController', () => {
  const chatsService = {
    listConversations: jest.fn(),
    createConversation: jest.fn(),
    getConversation: jest.fn(),
    listMessages: jest.fn(),
    sendTextMessage: jest.fn(),
    sendImageMessage: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    bulkRead: jest.fn(),
    deleteConversation: jest.fn(),
    bulkDelete: jest.fn(),
    reportConversation: jest.fn(),
  };

  let controller: ChatsController;
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ChatsController(chatsService as unknown as ChatsService);
  });

  it('GET /users/me/chats delegates to listConversations', () => {
    chatsService.listConversations.mockReturnValue({ data: [], meta: {} });

    expect(controller.list(user, { eventId: 'event-1', q: 'food' })).toEqual({
      data: [],
      meta: {},
    });
    expect(chatsService.listConversations).toHaveBeenCalledWith(
      user,
      'visitor',
      'event-1',
      'food',
      undefined,
      undefined,
    );
  });

  it('POST /users/me/chats delegates to createConversation', () => {
    const dto = { vendorId: 'vendor-1', eventId: 'event-1' };
    chatsService.createConversation.mockReturnValue({ id: 'conv-1' });

    expect(controller.create(user, dto)).toEqual({ id: 'conv-1' });
    expect(chatsService.createConversation).toHaveBeenCalledWith(user, dto);
  });

  it('POST /users/me/chats/read-all delegates to markAllRead', () => {
    chatsService.markAllRead.mockReturnValue({ updated: 2 });

    expect(controller.markAllRead(user, { eventId: 'event-1' })).toEqual({
      updated: 2,
    });
    expect(chatsService.markAllRead).toHaveBeenCalledWith(
      user,
      'visitor',
      'event-1',
    );
  });

  it('POST /users/me/chats/bulk-read delegates to bulkRead', () => {
    chatsService.bulkRead.mockReturnValue({ updated: 1 });

    expect(controller.bulkRead(user, { conversationIds: ['conv-1'] })).toEqual({
      updated: 1,
    });
    expect(chatsService.bulkRead).toHaveBeenCalledWith(user, 'visitor', {
      conversationIds: ['conv-1'],
    });
  });

  it('POST /users/me/chats/bulk-delete delegates to bulkDelete', () => {
    chatsService.bulkDelete.mockReturnValue({ deleted: 1 });

    expect(
      controller.bulkDelete(user, { conversationIds: ['conv-1'] }),
    ).toEqual({ deleted: 1 });
    expect(chatsService.bulkDelete).toHaveBeenCalledWith(user, 'visitor', {
      conversationIds: ['conv-1'],
    });
  });

  it('GET /users/me/chats/:conversationId delegates to getConversation', () => {
    chatsService.getConversation.mockReturnValue({ id: 'conv-1' });

    expect(controller.getOne(user, 'conv-1')).toEqual({ id: 'conv-1' });
    expect(chatsService.getConversation).toHaveBeenCalledWith(
      user,
      'visitor',
      'conv-1',
    );
  });

  it('GET /users/me/chats/:conversationId/messages delegates to listMessages', async () => {
    chatsService.listMessages.mockReturnValue({ data: [], meta: {} });

    expect(
      await controller.listMessages(user, 'conv-1', { page: 1, pageSize: 50 }),
    ).toEqual({ data: [], meta: {} });
    expect(chatsService.listMessages).toHaveBeenCalledWith(
      user,
      'visitor',
      'conv-1',
      1,
      50,
    );
  });

  it('POST /users/me/chats/:conversationId/messages delegates to sendTextMessage', () => {
    chatsService.sendTextMessage.mockReturnValue({ id: 'msg-1' });

    expect(controller.sendMessage(user, 'conv-1', { body: 'Hello' })).toEqual({
      id: 'msg-1',
    });
    expect(chatsService.sendTextMessage).toHaveBeenCalledWith(
      user,
      'visitor',
      'conv-1',
      'Hello',
    );
  });

  it('POST /users/me/chats/:conversationId/messages/media delegates to sendImageMessage', async () => {
    const file = { originalname: 'photo.jpg' } as Express.Multer.File;
    chatsService.sendImageMessage.mockReturnValue({ id: 'msg-2' });

    expect(await controller.sendImage(user, 'conv-1', file)).toEqual({
      id: 'msg-2',
    });
    expect(chatsService.sendImageMessage).toHaveBeenCalledWith(
      user,
      'visitor',
      'conv-1',
      file,
    );
  });

  it('PATCH /users/me/chats/:conversationId/read delegates to markRead', () => {
    chatsService.markRead.mockReturnValue({
      conversationId: 'conv-1',
      read: true,
    });

    expect(controller.markRead(user, 'conv-1')).toEqual({
      conversationId: 'conv-1',
      read: true,
    });
    expect(chatsService.markRead).toHaveBeenCalledWith(
      user,
      'visitor',
      'conv-1',
    );
  });

  it('DELETE /users/me/chats/:conversationId delegates to deleteConversation', () => {
    chatsService.deleteConversation.mockReturnValue({
      conversationId: 'conv-1',
      message: 'Chat deleted',
    });

    expect(controller.delete(user, 'conv-1')).toEqual({
      conversationId: 'conv-1',
      message: 'Chat deleted',
    });
    expect(chatsService.deleteConversation).toHaveBeenCalledWith(
      user,
      'visitor',
      'conv-1',
    );
  });

  it('POST /users/me/chats/:conversationId/report delegates to reportConversation', () => {
    chatsService.reportConversation.mockReturnValue({
      id: 'report-1',
      message: 'Thank you for reporting',
    });

    expect(
      controller.report(user, 'conv-1', {
        reason: ChatReportReason.HARASSMENT,
      }),
    ).toEqual({
      id: 'report-1',
      message: 'Thank you for reporting',
    });
    expect(chatsService.reportConversation).toHaveBeenCalledWith(
      user,
      'conv-1',
      { reason: ChatReportReason.HARASSMENT },
    );
  });
});
