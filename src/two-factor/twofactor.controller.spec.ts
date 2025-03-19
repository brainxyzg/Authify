import { Test, TestingModule } from '@nestjs/testing';
import { TwoFactorController } from './twofactor.controller';
import { TwoFactorService } from './twofactor.service';
import { JwtGuard } from '../common/middleware/jwt.guard';
import { RateLimitingGuard } from '../common/middleware/rate-limiting.guard';

const mockTwoFactorService = {
  enable2FA: jest.fn(),
  verify2FA: jest.fn(),
  disable2FA: jest.fn(),
  generateBackupCodes: jest.fn(),
};

const mockRequest = { user: { sub: 1 } };

describe('TwoFactorController', () => {
  let controller: TwoFactorController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TwoFactorController],
      providers: [{ provide: TwoFactorService, useValue: mockTwoFactorService }],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RateLimitingGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<TwoFactorController>(TwoFactorController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should enable 2FA', async () => {
    mockTwoFactorService.enable2FA.mockResolvedValue({ status: 'success', data: {} });
    const result = await controller.enable2FA(mockRequest);
    expect(result.status).toBe('success');
  });

  it('should verify 2FA', async () => {
    mockTwoFactorService.verify2FA.mockResolvedValue({
      status: 'success',
      data: { two_factor_enabled: true },
    });
    const result = await controller.verify2FA(mockRequest, { code: '123456' });
    expect(result.status).toBe('success');
  });

  it('should disable 2FA', async () => {
    mockTwoFactorService.disable2FA.mockResolvedValue({ status: 'success', data: null });
    const result = await controller.disable2FA(mockRequest);
    expect(result.status).toBe('success');
  });

  it('should generate backup codes', async () => {
    mockTwoFactorService.generateBackupCodes.mockResolvedValue({
      status: 'success',
      data: { backup_codes: ['123', '456'] },
    });
    const result = await controller.generateBackupCodes(mockRequest);
    expect(result.status).toBe('success');
  });
});
