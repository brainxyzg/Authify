import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { HealthService } from './health.service';
import { HealthCheckApiResponse } from './models/health.dto';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check service health' })
  @ApiResponse({ status: 200, description: 'Service is operational', type: Object })
  @ApiResponse({ status: 503, description: 'Service unavailable', type: Object })
  async checkHealth(): Promise<HealthCheckApiResponse> {
    const result = await this.healthService.checkHealth();
    if (result.status === 'error') {
      throw new HttpException(
        {
          status: result.status,
          message: result.message,
          code: result.code,
          data: result.data,
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return result;
  }
}
