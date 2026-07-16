import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { User } from '../entities/user.entity';

describe('VendorsController', () => {
  const vendorsService = {
    listByEvent: jest.fn(),
    search: jest.fn(),
    nearby: jest.fn(),
    recommended: jest.fn(),
    findOne: jest.fn(),
    getProducts: jest.fn(),
    getPromotions: jest.fn(),
    getReviews: jest.fn(),
    createReview: jest.fn(),
    updateReview: jest.fn(),
  };

  let controller: VendorsController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new VendorsController(
      vendorsService as unknown as VendorsService,
    );
  });

  it('passes event catalogue queries to the service', async () => {
    vendorsService.listByEvent.mockReturnValue({ data: [] });
    vendorsService.search.mockReturnValue({ data: [] });
    vendorsService.nearby.mockReturnValue({ data: [] });

    await controller.listByEvent('event-1', { page: 2, pageSize: 10 });
    await controller.search('event-1', {
      q: 'food',
      category: 'cat-1',
      offers: true,
      page: 1,
      pageSize: 20,
    });
    await controller.nearby('event-1', { lat: 5.1, lng: 7.2, radius: 250 });

    expect(vendorsService.listByEvent).toHaveBeenCalledWith('event-1', 2, 10);
    expect(vendorsService.search).toHaveBeenCalledWith(
      'event-1',
      'food',
      'cat-1',
      true,
      1,
      20,
    );
    expect(vendorsService.nearby).toHaveBeenCalledWith(
      'event-1',
      5.1,
      7.2,
      250,
    );
  });

  it('passes authenticated review commands to the service', async () => {
    const user = { id: 'user-1' } as User;
    vendorsService.createReview.mockReturnValue({ id: 'review-1' });
    vendorsService.updateReview.mockReturnValue({ id: 'review-1' });

    expect(
      await controller.createReview('vendor-1', user, {
        rating: 5,
        comment: 'Great',
      }),
    ).toEqual({ id: 'review-1' });
    expect(
      await controller.updateReview('vendor-1', user, {
        rating: 4,
      }),
    ).toEqual({ id: 'review-1' });

    expect(vendorsService.createReview).toHaveBeenCalledWith('vendor-1', user, {
      rating: 5,
      comment: 'Great',
    });
    expect(vendorsService.updateReview).toHaveBeenCalledWith('vendor-1', user, {
      rating: 4,
    });
  });
});
