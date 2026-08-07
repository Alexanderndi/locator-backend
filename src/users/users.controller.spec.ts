import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';

describe('UsersController', () => {
  const usersService = {
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    softDelete: jest.fn(),
  };

  let controller: UsersController;
  const user = { id: 'user-1' } as User;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new UsersController(usersService as unknown as UsersService);
  });

  it('delegates GET /users/me to getProfile', () => {
    usersService.getProfile.mockReturnValue({
      id: 'user-1',
      email: 'user@example.com',
    });

    expect(controller.getMe(user)).toEqual({
      id: 'user-1',
      email: 'user@example.com',
    });
    expect(usersService.getProfile).toHaveBeenCalledWith(user);
  });

  it('delegates PATCH /users/me to updateProfile', () => {
    const dto = { displayName: 'New Name' };
    usersService.updateProfile.mockReturnValue({ displayName: 'New Name' });

    expect(controller.updateMe(user, dto)).toEqual({ displayName: 'New Name' });
    expect(usersService.updateProfile).toHaveBeenCalledWith(user, dto);
  });

  it('delegates GET /users/me/preferences to getPreferences', () => {
    usersService.getPreferences.mockReturnValue({
      pushEnabled: true,
      favoriteCategories: [],
    });

    expect(controller.getPreferences(user)).toEqual({
      pushEnabled: true,
      favoriteCategories: [],
    });
    expect(usersService.getPreferences).toHaveBeenCalledWith('user-1');
  });

  it('delegates PATCH /users/me/preferences to updatePreferences', () => {
    const dto = { pushEnabled: false, favoriteCategories: ['Food'] };
    usersService.updatePreferences.mockReturnValue({
      pushEnabled: false,
      favoriteCategories: ['Food'],
    });

    expect(controller.updatePreferences(user, dto)).toEqual({
      pushEnabled: false,
      favoriteCategories: ['Food'],
    });
    expect(usersService.updatePreferences).toHaveBeenCalledWith('user-1', dto);
  });

  it('delegates DELETE /users/me to softDelete', () => {
    const dto = { password: 'TestPass1' };
    usersService.softDelete.mockReturnValue({
      message: 'Account deleted successfully',
    });

    expect(controller.deleteMe(user, dto)).toEqual({
      message: 'Account deleted successfully',
    });
    expect(usersService.softDelete).toHaveBeenCalledWith(user, dto);
  });
});
