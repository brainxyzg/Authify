import { HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  const mockHealthService = { checkHealth: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: mockHealthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => jest.clearAllMocks());

  describe('checkHealth', () => {
    it('should return success response when healthy', async () => {
      const successResponse = {
        status: 'success',
        data: { overall: 'healthy', database: 'ok', cache: 'ok' },
        message: 'Service is operational',
        timestamp: new Date().toISOString(),
        code: 'SUCCESS_HEALTH_CHECK',
      };
      mockHealthService.checkHealth.mockResolvedValue(successResponse);

      const result = await controller.checkHealth();
      expect(result).toEqual(successResponse);
    });

    it('should throw error when unhealthy', async () => {
      const errorResponse = {
        status: 'error',
        data: { component: 'database', reason: 'Connection failed' },
        message: 'Service unavailable',
        code: 'SERVICE_UNAVAILABLE',
        timestamp: new Date().toISOString(),
      };
      mockHealthService.checkHealth.mockResolvedValue(errorResponse);

      await expect(controller.checkHealth()).rejects.toThrow(new HttpException(errorResponse, 503));
    });
  });
});
