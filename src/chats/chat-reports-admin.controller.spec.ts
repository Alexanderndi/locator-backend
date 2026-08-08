import { ChatReportsAdminController } from './chat-reports-admin.controller';
import { ChatsService } from './chats.service';
import { ChatReportStatus } from '../common/enums';

describe('ChatReportsAdminController', () => {
  const chatsService = {
    listChatReports: jest.fn(),
    updateChatReport: jest.fn(),
  };

  let controller: ChatReportsAdminController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new ChatReportsAdminController(
      chatsService as unknown as ChatsService,
    );
  });

  it('delegates GET /admin/events/:eventId/chat-reports to listChatReports', () => {
    chatsService.listChatReports.mockReturnValue({ data: [] });

    expect(controller.listReports('event-1')).toEqual({ data: [] });
    expect(chatsService.listChatReports).toHaveBeenCalledWith('event-1');
  });

  it('delegates PATCH /admin/chat-reports/:reportId to updateChatReport', () => {
    chatsService.updateChatReport.mockReturnValue({
      id: 'report-1',
      status: ChatReportStatus.REVIEWED,
    });

    expect(
      controller.updateReport('report-1', {
        status: ChatReportStatus.REVIEWED,
      }),
    ).toEqual({
      id: 'report-1',
      status: ChatReportStatus.REVIEWED,
    });
  });
});
