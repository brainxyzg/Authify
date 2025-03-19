import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { RateLimitingGuard } from '../common/middleware/rate-limiting.guard';

const mockUsersService = {
  getCurrentUser: jest.fn(),
  updateUserInfo: jest.fn(),
  changePassword: jest.fn(),
  sendVerifyEmail: jest.fn(),
  verifyEmail: jest.fn(),
};

const mockRequest = { user: { sub: 1 } };

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitingGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should get current user', async () => {
    mockUsersService.getCurrentUser.mockResolvedValue({ status: 'success', data: {} });
    const result = await controller.getCurrentUser(mockRequest);
    expect(result.status).toBe('success');
  });

  it('should update user info', async () => {
    mockUsersService.updateUserInfo.mockResolvedValue({ status: 'success', data: { username: 'newjohndoe' } });
    const result = await controller.updateUserInfo(mockRequest, { username: 'newjohndoe' });
    expect(result.status).toBe('success');
  });

  it('should change password', async () => {
    mockUsersService.changePassword.mockResolvedValue({ status: 'success', data: null });
    const result = await controller.changePassword(mockRequest, { old_password: 'old', new_password: 'new' });
    expect(result.status).toBe('success');
  });

  it('should send verify email', async () => {
    mockUsersService.sendVerifyEmail.mockResolvedValue({ status: 'success', data: null });
    const result = await controller.sendVerifyEmail(mockRequest);
    expect(result.status).toBe('success');
  });

  it('should verify email', async () => {
    mockUsersService.verifyEmail.mockResolvedValue({ status: 'success', data: { is_email_verified: true } });
    const result = await controller.verifyEmail(mockRequest, { code: 'ABC123' });
    expect(result.status).toBe('success');
  });
});