import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

describe('MapsController', () => {
  const mapsService = {
    computeRoute: jest.fn(),
    validateQr: jest.fn(),
  };

  let controller: MapsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MapsController(mapsService as unknown as MapsService);
  });

  it('delegates POST /events/:eventId/routes to computeRoute', () => {
    const dto = { lat: 4.95, lng: 8.32, toVendorId: 'vendor-1' };
    mapsService.computeRoute.mockReturnValue({ distance: 100, reachable: true });

    expect(controller.computeRoute('event-1', dto)).toEqual({
      distance: 100,
      reachable: true,
    });
    expect(mapsService.computeRoute).toHaveBeenCalledWith('event-1', dto);
  });

  it('delegates GET /events/:eventId/qr/:vendorId to validateQr', () => {
    mapsService.validateQr.mockReturnValue({
      valid: true,
      vendor: { id: 'vendor-1' },
    });

    expect(controller.validateQr('event-1', 'vendor-1', 'sig-abc')).toEqual({
      valid: true,
      vendor: { id: 'vendor-1' },
    });
    expect(mapsService.validateQr).toHaveBeenCalledWith(
      'event-1',
      'vendor-1',
      'sig-abc',
    );
  });
});
