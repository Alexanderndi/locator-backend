import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { User } from '../entities/user.entity';

describe('NotificationsController', () => {
  const notificationsService = {
    registerDeviceToken: jest.fn(),
    revokeDeviceTokens: jest.fn(),
    getAnnouncements: jest.fn(),
    getAnnouncement: jest.fn(),
    getInbox: jest.fn(),
    markRead: jest.fn(),
    createReminder: jest.fn(),
    listReminders: jest.fn(),
    deleteReminder: jest.fn(),
  };

  let controller: NotificationsController;
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new NotificationsController(
      notificationsService as unknown as NotificationsService,
    );
  });

  it('delegates POST /users/me/device-tokens to registerDeviceToken', () => {
    const dto = { token: 'device-token', platform: 'ios' };
    notificationsService.registerDeviceToken.mockReturnValue({
      id: 'token-1',
      message: 'Device token registered',
    });

    expect(controller.registerDeviceToken(user, dto)).toEqual({
      id: 'token-1',
      message: 'Device token registered',
    });
    expect(notificationsService.registerDeviceToken).toHaveBeenCalledWith(
      'user-1',
      dto,
    );
  });

  it('delegates DELETE /users/me/device-tokens to revokeDeviceTokens', () => {
    const dto = { token: 'device-token' };
    notificationsService.revokeDeviceTokens.mockReturnValue({
      message: 'Device token revoked',
    });

    expect(controller.revokeDeviceTokens(user, dto)).toEqual({
      message: 'Device token revoked',
    });
    expect(notificationsService.revokeDeviceTokens).toHaveBeenCalledWith(
      'user-1',
      'device-token',
    );
  });

  it('delegates GET /events/:eventId/announcements to getAnnouncements', () => {
    notificationsService.getAnnouncements.mockReturnValue({ data: [] });

    expect(controller.getAnnouncements('event-1')).toEqual({ data: [] });
    expect(notificationsService.getAnnouncements).toHaveBeenCalledWith(
      'event-1',
    );
  });

  it('delegates GET /events/:eventId/announcements/:id to getAnnouncement', () => {
    notificationsService.getAnnouncement.mockReturnValue({
      id: 'announcement-1',
      title: 'Update',
    });

    expect(controller.getAnnouncement('event-1', 'announcement-1')).toEqual({
      id: 'announcement-1',
      title: 'Update',
    });
    expect(notificationsService.getAnnouncement).toHaveBeenCalledWith(
      'event-1',
      'announcement-1',
    );
  });

  it('delegates GET /users/me/notifications to getInbox with optional eventId', () => {
    notificationsService.getInbox.mockReturnValue({ data: [] });

    expect(controller.getInbox(user, 'event-1')).toEqual({ data: [] });
    expect(notificationsService.getInbox).toHaveBeenCalledWith(
      'user-1',
      'event-1',
    );
  });

  it('delegates PATCH /users/me/notifications/:id/read to markRead', () => {
    notificationsService.markRead.mockReturnValue({
      id: 'notif-1',
      read: true,
    });

    expect(controller.markRead(user, 'notif-1')).toEqual({
      id: 'notif-1',
      read: true,
    });
    expect(notificationsService.markRead).toHaveBeenCalledWith(
      'user-1',
      'notif-1',
    );
  });

  it('delegates POST /users/me/reminders to createReminder', () => {
    const dto = {
      vendorId: 'vendor-1',
      eventId: 'event-1',
      scheduledAt: '2026-07-24T18:00:00.000Z',
      message: 'Visit booth',
    };
    notificationsService.createReminder.mockReturnValue({ id: 'reminder-1' });

    expect(controller.createReminder(user, dto)).toEqual({ id: 'reminder-1' });
    expect(notificationsService.createReminder).toHaveBeenCalledWith(
      'user-1',
      dto,
    );
  });

  it('delegates GET /users/me/reminders to listReminders', () => {
    notificationsService.listReminders.mockReturnValue({ data: [] });

    expect(controller.listReminders(user)).toEqual({ data: [] });
    expect(notificationsService.listReminders).toHaveBeenCalledWith('user-1');
  });

  it('delegates DELETE /users/me/reminders/:id to deleteReminder', () => {
    notificationsService.deleteReminder.mockReturnValue({
      id: 'reminder-1',
      message: 'Reminder cancelled',
    });

    expect(controller.deleteReminder(user, 'reminder-1')).toEqual({
      id: 'reminder-1',
      message: 'Reminder cancelled',
    });
    expect(notificationsService.deleteReminder).toHaveBeenCalledWith(
      'user-1',
      'reminder-1',
    );
  });
});
