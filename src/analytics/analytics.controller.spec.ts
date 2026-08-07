import type { Response } from 'express';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { User } from '../entities/user.entity';

describe('AnalyticsController', () => {
  const analyticsService = {
    track: jest.fn(),
    trackBatch: jest.fn(),
    searchAnalytics: jest.fn(),
    searchAnalyticsCsv: jest.fn(),
    dashboard: jest.fn(),
  };

  let controller: AnalyticsController;
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AnalyticsController(
      analyticsService as unknown as AnalyticsService,
    );
  });

  it('delegates POST /analytics/events to track with optional user', () => {
    const dto = {
      eventId: 'event-1',
      type: 'search_performed',
      properties: { query: 'food' },
    };
    analyticsService.track.mockReturnValue({ id: 'evt-1', recorded: true });

    expect(controller.track(dto, user)).toEqual({
      id: 'evt-1',
      recorded: true,
    });
    expect(analyticsService.track).toHaveBeenCalledWith(dto, user);
  });

  it('delegates POST /analytics/events/batch to trackBatch', () => {
    const dto = {
      events: [{ eventId: 'event-1', type: 'search_result_clicked' }],
    };
    analyticsService.trackBatch.mockReturnValue({ recorded: 1 });

    expect(controller.trackBatch(dto, user)).toEqual({ recorded: 1 });
    expect(analyticsService.trackBatch).toHaveBeenCalledWith(dto.events, user);
  });

  it('delegates GET /analytics/search/:eventId to searchAnalytics', () => {
    analyticsService.searchAnalytics.mockReturnValue({ totalSearches: 10 });

    expect(
      controller.searchAnalytics('event-1', {
        from: '2026-07-01',
        to: '2026-07-24',
      }),
    ).toEqual({ totalSearches: 10 });
    expect(analyticsService.searchAnalytics).toHaveBeenCalledWith(
      'event-1',
      '2026-07-01',
      '2026-07-24',
    );
  });

  it('writes CSV export for GET /analytics/search/:eventId/export', async () => {
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;
    analyticsService.searchAnalytics.mockResolvedValue({ topSearches: [] });
    analyticsService.searchAnalyticsCsv.mockReturnValue('query,count\n');

    await controller.searchAnalyticsExport('event-1', {}, res);

    expect(analyticsService.searchAnalytics).toHaveBeenCalledWith(
      'event-1',
      undefined,
      undefined,
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Type',
      'text/csv; charset=utf-8',
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="search-analytics-event-1.csv"',
    );
    expect(res.send).toHaveBeenCalledWith('query,count\n');
  });

  it('delegates GET /analytics/dashboard/:eventId to dashboard', () => {
    analyticsService.dashboard.mockReturnValue({ dau: 100 });

    expect(controller.dashboard('event-1')).toEqual({ dau: 100 });
    expect(analyticsService.dashboard).toHaveBeenCalledWith('event-1');
  });
});
