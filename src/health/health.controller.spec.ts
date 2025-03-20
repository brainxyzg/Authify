import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { HealthCheckApiResponse } from './models/health.dto';

// Mock HealthService
const mockHealthService = {
  checkHealth: jest.fn(),
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: mockHealthService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkHealth', () => {
    it('should return health status when service is operational', async () => {
      const healthResponse: HealthCheckApiResponse = {
        status: 'success',
        data: {
          overall: 'healthy',
          database: 'ok',
          cache: 'ok',
        },
        message: 'Service is operational',
        code: 'SUCCESS_HEALTH_CHECK',
      };
      mockHealthService.checkHealth.mockResolvedValue(healthResponse);

      const result = await controller.checkHealth();
      expect(result).toEqual(healthResponse);
      expect(mockHealthService.checkHealth).toHaveBeenCalled();
    });

    it('should throw HttpException when service is unavailable', async () => {
      const errorResponse: HealthCheckApiResponse = {
        status: 'error',
        data: {
          component: 'database',
          reason: 'Database connection failed',
        },
        message: 'Service unavailable',
        code: 'SERVICE_UNAVAILABLE',
      };
      mockHealthService.checkHealth.mockResolvedValue(errorResponse);

      await expect(controller.checkHealth()).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            message: 'Service unavailable',
            code: 'SERVICE_UNAVAILABLE',
            data: { component: 'database', reason: 'Database connection failed' },
          },
          HttpStatus.SERVICE_UNAVAILABLE,
        ),
      );
      expect(mockHealthService.checkHealth).toHaveBeenCalled();
    });
  });
});
