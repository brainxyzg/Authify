import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../common/entities/user.entity';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { Logger } from '@nestjs/common';

// Mock 依赖
const mockUserRepository = {
  query: jest.fn(),
};
const mockCacheManager = {
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
};

// Mock Logger
jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

describe('HealthService', () => {
  let service: HealthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getRepositoryToken(User), useValue: mockUserRepository },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return healthy status when both database and cache are operational', async () => {
      mockUserRepository.query.mockResolvedValue([{ 1: 1 }]); // 模拟数据库查询成功
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue('ok');
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.checkHealth();
      expect(result).toEqual({
        status: 'success',
        data: {
          overall: 'healthy',
          database: 'ok',
          cache: 'ok',
        },
        message: 'Service is operational',
        code: 'SUCCESS_HEALTH_CHECK',
      });
      expect(mockUserRepository.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockCacheManager.set).toHaveBeenCalledWith('health:check', 'ok', 10);
      expect(mockCacheManager.get).toHaveBeenCalledWith('health:check');
      expect(mockCacheManager.del).toHaveBeenCalledWith('health:check');
    });

    it('should return error if database check fails', async () => {
      mockUserRepository.query.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.checkHealth();
      expect(result).toEqual({
        status: 'error',
        data: {
          component: 'database',
          reason: 'Database connection failed',
        },
        message: 'Service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      });
      expect(mockUserRepository.query).toHaveBeenCalledWith('SELECT 1');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Database health check failed: Database connection failed',
      );
      expect(mockCacheManager.set).not.toHaveBeenCalled(); // 未检查 Redis
    });

    it('should return error if cache check fails', async () => {
      mockUserRepository.query.mockResolvedValue([{ 1: 1 }]); // 数据库检查成功
      mockCacheManager.set.mockRejectedValue(new Error('Redis connection failed'));

      const result = await service.checkHealth();
      expect(result).toEqual({
        status: 'error',
        data: {
          component: 'cache',
          reason: 'Redis connection failed',
        },
        message: 'Service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      });
      expect(mockUserRepository.query).toHaveBeenCalledWith('SELECT 1');
      expect(mockCacheManager.set).toHaveBeenCalledWith('health:check', 'ok', 10);
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Redis health check failed: Redis connection failed',
      );
    });

    it('should return error if cache returns unexpected value', async () => {
      mockUserRepository.query.mockResolvedValue([{ 1: 1 }]); // 数据库检查成功
      mockCacheManager.set.mockResolvedValue(undefined);
      mockCacheManager.get.mockResolvedValue('wrong'); // 返回意外值
      mockCacheManager.del.mockResolvedValue(undefined);

      const result = await service.checkHealth();
      expect(result).toEqual({
        status: 'error',
        data: {
          component: 'cache',
          reason: 'Redis returned an unexpected value',
        },
        message: 'Service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      });
      expect(mockCacheManager.get).toHaveBeenCalledWith('health:check');
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Redis health check failed: Redis returned an unexpected value',
      );
    });
  });
});
