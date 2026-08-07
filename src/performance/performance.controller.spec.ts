import { PerformanceController } from './performance.controller';
import { PerformanceService } from './performance.service';
import { User } from '../entities/user.entity';

describe('PerformanceController', () => {
  const performanceService = {
    ingestBatch: jest.fn(),
    dashboard: jest.fn(),
  };

  let controller: PerformanceController;
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PerformanceController(
      performanceService as unknown as PerformanceService,
    );
  });

  it('delegates POST /performance/events/batch to ingestBatch', () => {
    const dto = {
      events: [{ kind: 'api_latency', name: '/v1/events', durationMs: 50 }],
    };
    performanceService.ingestBatch.mockReturnValue({ recorded: 1 });

    expect(controller.ingestBatch(dto, user)).toEqual({ recorded: 1 });
    expect(performanceService.ingestBatch).toHaveBeenCalledWith(
      dto.events,
      user,
    );
  });

  it('delegates GET /performance/dashboard/:eventId to dashboard with default hours', () => {
    performanceService.dashboard.mockReturnValue({ crashCount: 0 });

    expect(controller.dashboard('event-1', {})).toEqual({ crashCount: 0 });
    expect(performanceService.dashboard).toHaveBeenCalledWith('event-1', 1);
  });
});
