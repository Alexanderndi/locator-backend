import { VendorPortalController } from './vendor-portal.controller';
import { VendorPortalService } from './vendor-portal.service';
import { User } from '../entities/user.entity';

describe('VendorPortalController', () => {
  const vendorPortalService = {
    getDashboard: jest.fn(),
    listContactConsent: jest.fn(),
    requestContactConsent: jest.fn(),
  };

  let controller: VendorPortalController;
  const user = { id: 'user-1', vendorId: 'vendor-1' } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VendorPortalController(
      vendorPortalService as unknown as VendorPortalService,
    );
  });

  it('delegates GET /vendor-portal/dashboard to getDashboard', () => {
    vendorPortalService.getDashboard.mockReturnValue({
      vendor: { id: 'vendor-1' },
    });

    expect(controller.getDashboard(user)).toEqual({
      vendor: { id: 'vendor-1' },
    });
    expect(vendorPortalService.getDashboard).toHaveBeenCalledWith(user);
  });

  it('delegates GET /vendor-portal/contact-consent-requests to listContactConsent', () => {
    vendorPortalService.listContactConsent.mockReturnValue({ data: [] });

    expect(controller.listContactConsent(user)).toEqual({ data: [] });
    expect(vendorPortalService.listContactConsent).toHaveBeenCalledWith(user);
  });

  it('delegates POST /vendor-portal/contact-consent-requests to requestContactConsent', () => {
    const dto = { userEmail: 'visitor@example.com', eventId: 'event-1' };
    vendorPortalService.requestContactConsent.mockReturnValue({ id: 'req-1' });

    expect(controller.requestContactConsent(user, dto)).toEqual({
      id: 'req-1',
    });
    expect(vendorPortalService.requestContactConsent).toHaveBeenCalledWith(
      user,
      dto,
    );
  });
});
