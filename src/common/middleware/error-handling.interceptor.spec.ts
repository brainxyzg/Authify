import { Test, TestingModule } from '@nestjs/testing';
import { ErrorHandlingInterceptor } from './error-handling.interceptor';
import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { CallHandler } from '@nestjs/common';
import { ApiResponse } from '../models/api-response.dto';

// Mock ExecutionContext
const mockExecutionContext = {} as ExecutionContext;

// Mock CallHandler
const createMockCallHandler = (observable: Observable<any>): CallHandler => ({
  handle: () => observable,
});

describe('ErrorHandlingInterceptor', () => {
  let interceptor: ErrorHandlingInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ErrorHandlingInterceptor],
    }).compile();

    interceptor = module.get<ErrorHandlingInterceptor>(ErrorHandlingInterceptor);
  });

  describe('intercept', () => {
    it('should pass through successful response', async () => {
      const mockData = { id: 1, name: 'Test' };
      const callHandler = createMockCallHandler(of(mockData));
      const result$ = interceptor.intercept(mockExecutionContext, callHandler);

      const result = await result$.toPromise();
      expect(result).toEqual(mockData);
    });

    it('should handle generic error and return INTERNAL_SERVER_ERROR', async () => {
      const error = new Error('Something went wrong');
      const callHandler = createMockCallHandler(throwError(() => error));
      const result$ = interceptor.intercept(mockExecutionContext, callHandler);

      await expect(result$.toPromise()).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'Something went wrong',
            code: 'INTERNAL_SERVER_ERROR',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });

    it('should handle HttpException and preserve status and message', async () => {
      const httpException = new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      const callHandler = createMockCallHandler(throwError(() => httpException));
      const result$ = interceptor.intercept(mockExecutionContext, callHandler);

      await expect(result$.toPromise()).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'Unauthorized',
            code: 'INTERNAL_SERVER_ERROR', // 默认 code，未在原始异常中指定
          },
          HttpStatus.UNAUTHORIZED,
        ),
      );
    });

    it('should handle custom HttpException with response object', async () => {
      const customResponse = {
        status: 'error',
        data: null,
        message: 'Invalid input',
        code: 'INVALID_INPUT',
      };
      const httpException = new HttpException(customResponse, HttpStatus.BAD_REQUEST);
      const callHandler = createMockCallHandler(throwError(() => httpException));
      const result$ = interceptor.intercept(mockExecutionContext, callHandler);

      await expect(result$.toPromise()).rejects.toThrow(
        new HttpException(customResponse, HttpStatus.BAD_REQUEST),
      );
    });

    it('should use default message for generic error without message', async () => {
      const error = new Error(); // 无 message
      const callHandler = createMockCallHandler(throwError(() => error));
      const result$ = interceptor.intercept(mockExecutionContext, callHandler);

      await expect(result$.toPromise()).rejects.toThrow(
        new HttpException(
          {
            status: 'error',
            data: null,
            message: 'Internal server error',
            code: 'INTERNAL_SERVER_ERROR',
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        ),
      );
    });
  });
});
