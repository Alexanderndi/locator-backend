import { VendorChatsController } from './vendor-chats.controller';
import { ChatsService } from './chats.service';
import { User } from '../entities/user.entity';

describe('VendorChatsController', () => {
  const chatsService = {
    listConversations: jest.fn(),
    getConversation: jest.fn(),
    listMessages: jest.fn(),
    sendTextMessage: jest.fn(),
    sendImageMessage: jest.fn(),
    markRead: jest.fn(),
    markAllRead: jest.fn(),
    bulkRead: jest.fn(),
    deleteConversation: jest.fn(),
    bulkDelete: jest.fn(),
  };

  let controller: VendorChatsController;
  const user = { id: 'vendor-user-1', vendorId: 'vendor-1' } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VendorChatsController(
      chatsService as unknown as ChatsService,
    );
  });

  it('GET /vendor-portal/chats delegates to listConversations', () => {
    chatsService.listConversations.mockReturnValue({ data: [] });

    expect(controller.list(user, {})).toEqual({ data: [] });
    expect(chatsService.listConversations).toHaveBeenCalledWith(
      user,
      'vendor',
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('POST /vendor-portal/chats/read-all delegates to markAllRead', () => {
    chatsService.markAllRead.mockReturnValue({ updated: 1 });

    expect(controller.markAllRead(user, { eventId: 'event-1' })).toEqual({
      updated: 1,
    });
    expect(chatsService.markAllRead).toHaveBeenCalledWith(
      user,
      'vendor',
      'event-1',
    );
  });

  it('POST /vendor-portal/chats/bulk-read delegates to bulkRead', () => {
    chatsService.bulkRead.mockReturnValue({ updated: 1 });

    expect(controller.bulkRead(user, { conversationIds: ['conv-1'] })).toEqual({
      updated: 1,
    });
    expect(chatsService.bulkRead).toHaveBeenCalledWith(user, 'vendor', {
      conversationIds: ['conv-1'],
    });
  });

  it('POST /vendor-portal/chats/bulk-delete delegates to bulkDelete', () => {
    chatsService.bulkDelete.mockReturnValue({ deleted: 1 });

    expect(
      controller.bulkDelete(user, { conversationIds: ['conv-1'] }),
    ).toEqual({ deleted: 1 });
    expect(chatsService.bulkDelete).toHaveBeenCalledWith(user, 'vendor', {
      conversationIds: ['conv-1'],
    });
  });

  it('GET /vendor-portal/chats/:conversationId delegates to getConversation', () => {
    chatsService.getConversation.mockReturnValue({ id: 'conv-1' });

    expect(controller.getOne(user, 'conv-1')).toEqual({ id: 'conv-1' });
    expect(chatsService.getConversation).toHaveBeenCalledWith(
      user,
      'vendor',
      'conv-1',
    );
  });

  it('GET /vendor-portal/chats/:conversationId/messages delegates to listMessages', async () => {
    chatsService.listMessages.mockReturnValue({ data: [] });

    expect(
      await controller.listMessages(user, 'conv-1', { page: 1, pageSize: 50 }),
    ).toEqual({ data: [] });
    expect(chatsService.listMessages).toHaveBeenCalledWith(
      user,
      'vendor',
      'conv-1',
      1,
      50,
    );
  });

  it('POST /vendor-portal/chats/:conversationId/messages delegates to sendTextMessage', () => {
    chatsService.sendTextMessage.mockReturnValue({ id: 'msg-1' });

    expect(
      controller.sendMessage(user, 'conv-1', { body: 'Thanks for visiting' }),
    ).toEqual({ id: 'msg-1' });
    expect(chatsService.sendTextMessage).toHaveBeenCalledWith(
      user,
      'vendor',
      'conv-1',
      'Thanks for visiting',
    );
  });

  it('POST /vendor-portal/chats/:conversationId/messages/media delegates to sendImageMessage', async () => {
    const file = { originalname: 'booth.jpg' } as Express.Multer.File;
    chatsService.sendImageMessage.mockReturnValue({ id: 'msg-2' });

    expect(await controller.sendImage(user, 'conv-1', file)).toEqual({
      id: 'msg-2',
    });
    expect(chatsService.sendImageMessage).toHaveBeenCalledWith(
      user,
      'vendor',
      'conv-1',
      file,
    );
  });

  it('PATCH /vendor-portal/chats/:conversationId/read delegates to markRead', () => {
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
      'vendor',
      'conv-1',
    );
  });

  it('DELETE /vendor-portal/chats/:conversationId delegates to deleteConversation', () => {
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
      'vendor',
      'conv-1',
    );
  });
});
