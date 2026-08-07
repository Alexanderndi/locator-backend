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
    listMyCatalogue: jest.fn(),
    createCatalogueItem: jest.fn(),
    deleteCatalogueItem: jest.fn(),
  };

  let controller: VendorsController;
  const user = { id: 'user-1' } as User;

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

  it('delegates GET /events/:eventId/vendors/recommended with optional user', async () => {
    vendorsService.recommended.mockReturnValue({
      data: [],
      personalized: true,
    });

    expect(await controller.recommended('event-1', user)).toEqual({
      data: [],
      personalized: true,
    });
    expect(vendorsService.recommended).toHaveBeenCalledWith('event-1', user);

    vendorsService.recommended.mockReturnValue({
      data: [],
      personalized: false,
    });
    expect(await controller.recommended('event-1')).toEqual({
      data: [],
      personalized: false,
    });
    expect(vendorsService.recommended).toHaveBeenCalledWith(
      'event-1',
      undefined,
    );
  });

  it('delegates GET /vendors/:vendorId to findOne', async () => {
    vendorsService.findOne.mockReturnValue({ id: 'vendor-1', name: 'Kitchen' });

    expect(await controller.findOne('vendor-1')).toEqual({
      id: 'vendor-1',
      name: 'Kitchen',
    });
    expect(vendorsService.findOne).toHaveBeenCalledWith('vendor-1');
  });

  it('delegates GET /vendors/:vendorId/products with pagination', async () => {
    vendorsService.getProducts.mockReturnValue({ data: [], meta: {} });

    expect(
      await controller.getProducts('vendor-1', { page: 1, pageSize: 20 }),
    ).toEqual({ data: [], meta: {} });
    expect(vendorsService.getProducts).toHaveBeenCalledWith('vendor-1', 1, 20);
  });

  it('delegates GET /vendors/:vendorId/promotions to getPromotions', async () => {
    vendorsService.getPromotions.mockReturnValue({ data: [] });

    expect(await controller.getPromotions('vendor-1')).toEqual({ data: [] });
    expect(vendorsService.getPromotions).toHaveBeenCalledWith('vendor-1');
  });

  it('delegates GET /vendors/:vendorId/reviews with optional user', async () => {
    vendorsService.getReviews.mockReturnValue({
      data: [],
      meta: {},
      userReview: null,
    });

    expect(
      await controller.getReviews('vendor-1', { page: 1, pageSize: 10 }, user),
    ).toEqual({ data: [], meta: {}, userReview: null });
    expect(vendorsService.getReviews).toHaveBeenCalledWith(
      'vendor-1',
      1,
      10,
      user,
    );
  });

  it('passes authenticated review commands to the service', async () => {
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

  it('delegates vendor catalogue endpoints to the service', async () => {
    const file = { originalname: 'item.jpg' } as Express.Multer.File;
    vendorsService.listMyCatalogue.mockReturnValue({ data: [] });
    vendorsService.createCatalogueItem.mockReturnValue({ id: 'product-1' });
    vendorsService.deleteCatalogueItem.mockReturnValue({
      message: 'Catalogue item deleted',
    });

    expect(
      await controller.listMyProducts(user, { page: 1, pageSize: 50 }),
    ).toEqual({ data: [] });
    expect(await controller.createMyProduct(user, file, 'Item name')).toEqual({
      id: 'product-1',
    });
    expect(await controller.deleteMyProduct(user, 'product-1')).toEqual({
      message: 'Catalogue item deleted',
    });

    expect(vendorsService.listMyCatalogue).toHaveBeenCalledWith(user, 1, 50);
    expect(vendorsService.createCatalogueItem).toHaveBeenCalledWith(
      user,
      file,
      'Item name',
    );
    expect(vendorsService.deleteCatalogueItem).toHaveBeenCalledWith(
      user,
      'product-1',
    );
  });
});
