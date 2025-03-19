import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SsoService } from './sso.service';
import { User } from '../common/entities/user.entity';
import { LoginMethod } from '../common/entities/login-method.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SsoProvider } from './models/sso.dto';
import { RedisService } from '../common/services/redis.service';

describe('SsoService', () => {
  let service: SsoService;
  const mockUserRepository = { findOne: jest.fn(), save: jest.fn(), create: jest.fn() };
  const mockLoginMethodRepository = { create: jest.fn(), save: jest.fn() };
  const mockJwtService = { sign: jest.fn(() => 'mock-jwt') };
  const mockConfigService = {
    get: jest.fn(key => {
      const config = {
        GOOGLE_CLIENT_ID: 'google-id',
        GOOGLE_CLIENT_SECRET: 'google-secret',
        GITHUB_CLIENT_ID: 'github-id',
        GITHUB_CLIENT_SECRET: 'github-secret',
        BASE_URL: 'http://localhost:3000',
        JWT_SECRET: 'secret',
      };
      return config[key];
    }),
  };
  const mockRedisService = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SsoService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: getRepositoryToken(LoginMethod), useValue: mockLoginMethodRepository },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<SsoService>(SsoService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('initiateSso', () => {
    it('should return Google auth URL', async () => {
      const result = await service.initiateSso(SsoProvider.GOOGLE);
      expect(result).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(result).toContain('client_id=google-id');
    });

    it('should throw error for invalid provider', async () => {
      await expect(service.initiateSso('invalid' as any)).rejects.toThrow(HttpException);
    });
  });

  describe('handleSsoCallback', () => {
    it('should handle Google callback and return tokens with valid state', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ access_token: 'google-token' }),
          } as any),
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ email: 'john@example.com', sub: '123' }),
          } as any),
        );
      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({ id: 1, email: 'john@example.com' });
      mockUserRepository.save.mockResolvedValue({ id: 1, email: 'john@example.com' });
      mockLoginMethodRepository.create.mockReturnValue({});
      mockLoginMethodRepository.save.mockResolvedValue({});
      mockRedisService.get.mockResolvedValue(SsoProvider.GOOGLE);

      const result = await service.handleSsoCallback(SsoProvider.GOOGLE, 'code', 'valid-state');
      expect(result.status).toBe('success');
      expect(result.data.access_token).toBe('mock-jwt');
      expect(mockRedisService.del).toHaveBeenCalledWith('sso:state:valid-state');
    });

    it('should return error for invalid code', async () => {
      jest
        .spyOn(global, 'fetch')
        .mockImplementation(() =>
          Promise.resolve({ ok: false, json: () => Promise.resolve({}) } as any),
        );

      const result = await service.handleSsoCallback(SsoProvider.GOOGLE, 'invalid-code');
      expect(result.status).toBe('error');
      expect(result.code).toBe('MISSING_CSRF_STATE');
    });
  });
});
