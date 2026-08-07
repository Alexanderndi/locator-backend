import {
  ContactConsentController,
  VendorContactConsentController,
} from './contact-consent.controller';
import { ContactConsentService } from './contact-consent.service';
import { User } from '../entities/user.entity';

describe('ContactConsentController', () => {
  const contactConsentService = {
    listForVisitor: jest.fn(),
    respond: jest.fn(),
    createRequest: jest.fn(),
    listForVendor: jest.fn(),
  };

  let visitorController: ContactConsentController;
  let vendorController: VendorContactConsentController;
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    visitorController = new ContactConsentController(
      contactConsentService as unknown as ContactConsentService,
    );
    vendorController = new VendorContactConsentController(
      contactConsentService as unknown as ContactConsentService,
    );
  });

  it('delegates GET /users/me/contact-consent-requests to listForVisitor', () => {
    contactConsentService.listForVisitor.mockReturnValue({ data: [] });

    expect(visitorController.list(user)).toEqual({ data: [] });
    expect(contactConsentService.listForVisitor).toHaveBeenCalledWith('user-1');
  });

  it('delegates POST /users/me/contact-consent-requests/:id/respond to respond', () => {
    const dto = { action: 'accept' as const };
    contactConsentService.respond.mockReturnValue({
      id: 'req-1',
      status: 'accepted',
    });

    expect(visitorController.respond(user, 'req-1', dto)).toEqual({
      id: 'req-1',
      status: 'accepted',
    });
    expect(contactConsentService.respond).toHaveBeenCalledWith(
      'user-1',
      'req-1',
      dto,
    );
  });

  it('delegates POST /vendors/:vendorId/contact-consent-requests to createRequest', () => {
    const dto = { eventId: 'event-1', userEmail: 'visitor@example.com' };
    contactConsentService.createRequest.mockReturnValue({ id: 'req-1' });

    expect(vendorController.create('vendor-1', dto)).toEqual({ id: 'req-1' });
    expect(contactConsentService.createRequest).toHaveBeenCalledWith(
      'vendor-1',
      dto,
    );
  });

  it('delegates GET /vendors/:vendorId/contact-consent-requests to listForVendor', () => {
    contactConsentService.listForVendor.mockReturnValue({ data: [] });

    expect(vendorController.list('vendor-1')).toEqual({ data: [] });
    expect(contactConsentService.listForVendor).toHaveBeenCalledWith(
      'vendor-1',
    );
  });
});
