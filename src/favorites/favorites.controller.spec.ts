import { FavoritesController } from './favorites.controller';
import { FavoritesService } from './favorites.service';
import { User } from '../entities/user.entity';

describe('FavoritesController', () => {
  const favoritesService = {
    list: jest.fn(),
    add: jest.fn(),
    remove: jest.fn(),
  };

  let controller: FavoritesController;
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new FavoritesController(
      favoritesService as unknown as FavoritesService,
    );
  });

  it('delegates GET /users/me/favorites to list with optional eventId', () => {
    favoritesService.list.mockReturnValue({ data: [] });

    expect(controller.list(user, { eventId: 'event-1' })).toEqual({ data: [] });
    expect(favoritesService.list).toHaveBeenCalledWith('user-1', 'event-1');
  });

  it('delegates POST /users/me/favorites to add', () => {
    const dto = { vendorId: 'vendor-1', eventId: 'event-1' };
    favoritesService.add.mockReturnValue({
      id: 'fav-1',
      alreadyExists: false,
    });

    expect(controller.add(user, dto)).toEqual({
      id: 'fav-1',
      alreadyExists: false,
    });
    expect(favoritesService.add).toHaveBeenCalledWith(user, dto);
  });

  it('delegates DELETE /users/me/favorites/:vendorId to remove', () => {
    favoritesService.remove.mockReturnValue({ message: 'Favorite removed' });

    expect(controller.remove(user, 'vendor-1')).toEqual({
      message: 'Favorite removed',
    });
    expect(favoritesService.remove).toHaveBeenCalledWith('user-1', 'vendor-1');
  });
});
