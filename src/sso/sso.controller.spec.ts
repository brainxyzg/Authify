import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { SsoController } from './sso.controller';
import { SsoService } from './sso.service';
import { RateLimitingGuard } from '../common/middleware/rate-limiting.guard';
import { SsoProvider } from './models/sso.dto';

describe('SsoController', () => {
  let controller: SsoController;
  const mockSsoService = { initiateSso: jest.fn(), handleSsoCallback: jest.fn() };
  const mockResponse = { redirect: jest.fn(), status: jest.fn().mockReturnThis(), json: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SsoController],
      providers: [{ provide: SsoService, useValue: mockSsoService }],
    })
      .overrideGuard(RateLimitingGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SsoController>(SsoController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('initiateSso', () => {
    it('should redirect to provider auth URL', async () => {
      mockSsoService.initiateSso.mockResolvedValue('https://accounts.google.com/auth');
      await controller.initiateSso({ provider: SsoProvider.GOOGLE }, mockResponse as any);
      expect(mockResponse.redirect).toHaveBeenCalledWith(302, 'https://accounts.google.com/auth');
    });
  });

  describe('handleSsoCallback', () => {
    it('should return tokens on successful callback', async () => {
      const successResponse = { status: 'success', data: { access_token: 'xyz' } };
      mockSsoService.handleSsoCallback.mockResolvedValue(successResponse);
      await controller.handleSsoCallback(
        { provider: SsoProvider.GOOGLE },
        { code: 'code' },
        mockResponse as any,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(successResponse);
    });

    it('should throw error on invalid callback', async () => {
      const errorResponse = { status: 'error', code: 'INVALID_SSO_CODE' };
      mockSsoService.handleSsoCallback.mockResolvedValue(errorResponse);
      await expect(
        controller.handleSsoCallback(
          { provider: SsoProvider.GOOGLE },
          { code: 'invalid' },
          mockResponse as any,
        ),
      ).rejects.toThrow(HttpException);
    });
  });
});
