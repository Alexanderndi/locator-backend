import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ContactConsentService } from './contact-consent.service';
import { ContactConsentRequest } from '../entities/contact-consent-request.entity';
import { Favorite } from '../entities/favorite.entity';
import { AnalyticsEvent } from '../entities/analytics-event.entity';
import { User } from '../entities/user.entity';
import { Vendor } from '../entities/vendor.entity';
import { EventsService } from '../events/events.service';
import { VendorsService } from '../vendors/vendors.service';
import {
  ContactConsentStatus,
  UserRole,
} from '../common/enums';

describe('ContactConsentService', () => {
  let service: ContactConsentService;

  const mockConsentRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((dto) => dto),
    save: jest.fn(async (dto) => ({ id: 'req-1', ...dto })),
  };

  const mockFavoriteRepo = {
    findOne: jest.fn(),
  };

  const mockAnalyticsRepo = {
    find: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockVendorRepo = {
    findOne: jest.fn(),
  };

  const mockEventsService = {
    ensureEvent: jest.fn(),
  };

  const mockVendorsService = {
    ensureVendor: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactConsentService,
        { provide: getRepositoryToken(ContactConsentRequest), useValue: mockConsentRepo },
        { provide: getRepositoryToken(Favorite), useValue: mockFavoriteRepo },
        { provide: getRepositoryToken(AnalyticsEvent), useValue: mockAnalyticsRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: getRepositoryToken(Vendor), useValue: mockVendorRepo },
        { provide: EventsService, useValue: mockEventsService },
        { provide: VendorsService, useValue: mockVendorsService },
      ],
    }).compile();

    service = module.get(ContactConsentService);
  });

  it('rejects consent request when visitor has not engaged', async () => {
    mockVendorsService.ensureVendor.mockResolvedValue({
      id: 'vendor-1',
      eventId: 'event-1',
      name: 'Test Vendor',
    });
    mockUserRepo.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'demo@fvl.io',
      phone: '+123',
      role: UserRole.VISITOR,
      displayName: 'Demo',
    });
    mockFavoriteRepo.findOne.mockResolvedValue(null);
    mockAnalyticsRepo.find.mockResolvedValue([]);
    mockConsentRepo.find.mockResolvedValue([]);

    await expect(
      service.createRequest('vendor-1', {
        eventId: 'event-1',
        userEmail: 'demo@fvl.io',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('creates pending request when visitor favorited vendor', async () => {
    mockVendorsService.ensureVendor.mockResolvedValue({
      id: 'vendor-1',
      eventId: 'event-1',
      name: 'Test Vendor',
      boothNumber: 'A-1',
    });
    mockUserRepo.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'demo@fvl.io',
      phone: '+123',
      role: UserRole.VISITOR,
      displayName: 'Demo',
    });
    mockFavoriteRepo.findOne.mockResolvedValue({ userId: 'user-1', vendorId: 'vendor-1' });
    mockConsentRepo.find.mockResolvedValue([]);
    mockConsentRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'req-1',
        vendorId: 'vendor-1',
        userId: 'user-1',
        eventId: 'event-1',
        status: ContactConsentStatus.PENDING,
        requestedAt: new Date(),
        vendor: { id: 'vendor-1', name: 'Test Vendor', boothNumber: 'A-1' },
        user: { id: 'user-1', displayName: 'Demo' },
      });

    const result = await service.createRequest('vendor-1', {
      eventId: 'event-1',
      userId: 'user-1',
    });

    expect(result.status).toBe(ContactConsentStatus.PENDING);
    expect(result.sharedEmail).toBeUndefined();
  });

  it('shares contact on accept and hides on decline', async () => {
    const pendingRequest = {
      id: 'req-1',
      vendorId: 'vendor-1',
      userId: 'user-1',
      eventId: 'event-1',
      status: ContactConsentStatus.PENDING,
      requestedAt: new Date(),
      expiresAt: new Date(Date.now() + 86400000),
      vendor: { id: 'vendor-1', name: 'Test Vendor', boothNumber: 'A-1' },
      user: {
        id: 'user-1',
        email: 'demo@fvl.io',
        phone: '+123',
        displayName: 'Demo',
      },
    };

    mockConsentRepo.findOne.mockResolvedValue(pendingRequest);
    mockConsentRepo.save.mockImplementation(async (dto) => dto);

    const accepted = await service.respond('user-1', 'req-1', { action: 'accept' });
    expect(accepted.status).toBe(ContactConsentStatus.ACCEPTED);
    expect(mockConsentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sharedEmail: 'demo@fvl.io',
        sharedPhone: '+123',
      }),
    );

    pendingRequest.status = ContactConsentStatus.PENDING;
    const declined = await service.respond('user-1', 'req-1', { action: 'decline' });
    expect(declined.status).toBe(ContactConsentStatus.DECLINED);
    expect(mockConsentRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        sharedEmail: null,
        sharedPhone: null,
      }),
    );
  });

  it('blocks duplicate pending requests', async () => {
    mockVendorsService.ensureVendor.mockResolvedValue({
      id: 'vendor-1',
      eventId: 'event-1',
    });
    mockUserRepo.findOne.mockResolvedValue({
      id: 'user-1',
      role: UserRole.VISITOR,
    });
    mockFavoriteRepo.findOne.mockResolvedValue({ userId: 'user-1', vendorId: 'vendor-1' });
    mockConsentRepo.find.mockResolvedValue([]);
    mockConsentRepo.findOne.mockResolvedValue({
      id: 'existing',
      status: ContactConsentStatus.PENDING,
    });

    await expect(
      service.createRequest('vendor-1', { eventId: 'event-1', userId: 'user-1' }),
    ).rejects.toThrow(ConflictException);
  });
});
