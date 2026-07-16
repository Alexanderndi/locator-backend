import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { EventStatus } from '../common/enums';

describe('EventsController', () => {
  const eventsService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    getSchedule: jest.fn(),
    getCategories: jest.fn(),
    getMap: jest.fn(),
  };

  let controller: EventsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new EventsController(
      eventsService as unknown as EventsService,
    );
  });

  it('delegates event listing filters to the service', () => {
    eventsService.findAll.mockReturnValue({ data: [] });

    expect(controller.findAll(EventStatus.ACTIVE, '5.1,7.2')).toEqual({
      data: [],
    });
    expect(eventsService.findAll).toHaveBeenCalledWith(
      EventStatus.ACTIVE,
      '5.1,7.2',
    );
  });

  it('delegates detail and child resources by event id', () => {
    eventsService.findOne.mockReturnValue({ id: 'event-1' });
    eventsService.getSchedule.mockReturnValue({ schedule: [] });
    eventsService.getCategories.mockReturnValue({ data: [] });
    eventsService.getMap.mockReturnValue({ eventId: 'event-1' });

    expect(controller.findOne('event-1')).toEqual({ id: 'event-1' });
    expect(controller.getSchedule('event-1')).toEqual({ schedule: [] });
    expect(controller.getCategories('event-1')).toEqual({ data: [] });
    expect(controller.getMap('event-1')).toEqual({ eventId: 'event-1' });
  });
});
