import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HealthService } from './health.service';
import { User } from '../common/entities/user.entity';
import { RedisService } from '../common/services/redis.service';

// 模拟 UserRepository
const mockUserRepository = {
  query: jest.fn(),
};

// 模拟 RedisService
const mockRedisService = {
  ping: jest.fn(),
  health: jest.fn(), // 添加 health 方法
};

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkHealth', () => {
    it('should return healthy status when all checks pass', async () => {
      mockUserRepository.query.mockResolvedValue([{ now: new Date().toISOString() }]);
      mockRedisService.health.mockResolvedValue({
        status: 'ok',
      });

      const result = await service.checkHealth();
      console.log('Health check result:', JSON.stringify(result, null, 2));
      expect(result.status).toBe('success');
    });

    it('should return error if database fails', async () => {
      mockUserRepository.query.mockRejectedValue(new Error('DB connection error'));
      mockRedisService.health.mockResolvedValue(true);

      const result = await service.checkHealth();
      expect(result.status).toBe('error');
    });

    it('should return error if cache fails', async () => {
      mockUserRepository.query.mockResolvedValue([{ now: new Date().toISOString() }]);
      mockRedisService.health.mockRejectedValue(new Error('Redis connection error'));

      const result = await service.checkHealth();
      expect(result.status).toBe('error');
      // expect(result.database).toBe('connected');
      // expect(result.cache).toBe('error');
    });
  });
});
