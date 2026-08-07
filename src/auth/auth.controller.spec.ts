import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  const authService = {
    register: jest.fn(),
    registerVendor: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    requestOtp: jest.fn(),
    verifyOtp: jest.fn(),
  };

  let controller: AuthController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('delegates visitor registration and login', () => {
    const registerDto = {
      email: 'user@example.com',
      password: 'TestPass1',
      displayName: 'User',
      phone: '+2348012345678',
    };
    const loginDto = {
      email: 'user@example.com',
      password: 'TestPass1',
    };

    authService.register.mockReturnValue({
      user: { email: registerDto.email },
    });
    authService.login.mockReturnValue({ accessToken: 'token' });

    expect(controller.register(registerDto)).toEqual({
      user: { email: registerDto.email },
    });
    expect(controller.login(loginDto)).toEqual({ accessToken: 'token' });
  });

  it('delegates vendor registration to the service', () => {
    const registerVendorDto = {
      email: 'vendor@example.com',
      password: 'TestPass1',
      displayName: 'Vendor',
      eventId: 'event-1',
      businessName: 'Mama Kitchen',
      latitude: 4.95,
      longitude: 8.32,
    };

    authService.registerVendor.mockReturnValue({
      user: { role: 'vendor' },
      vendor: { id: 'vendor-1' },
    });

    expect(controller.registerVendor(registerVendorDto)).toEqual({
      user: { role: 'vendor' },
      vendor: { id: 'vendor-1' },
    });
    expect(authService.registerVendor).toHaveBeenCalledWith(registerVendorDto);
  });

  it('passes token and OTP commands to the service', () => {
    authService.refresh.mockReturnValue({ accessToken: 'new-token' });
    authService.logout.mockReturnValue({ message: 'Logged out successfully' });
    authService.requestOtp.mockReturnValue({
      message: 'OTP sent successfully',
    });
    authService.verifyOtp.mockReturnValue({ accessToken: 'otp-token' });

    expect(controller.refresh({ refreshToken: 'refresh-token' })).toEqual({
      accessToken: 'new-token',
    });
    expect(controller.logout({ refreshToken: 'refresh-token' })).toEqual({
      message: 'Logged out successfully',
    });
    expect(controller.requestOtp({ phone: '+2348012345678' })).toEqual({
      message: 'OTP sent successfully',
    });
    expect(
      controller.verifyOtp({ phone: '+2348012345678', code: '123456' }),
    ).toEqual({ accessToken: 'otp-token' });
  });
});
