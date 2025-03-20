import { Test, TestingModule } from '@nestjs/testing';
import { CorsMiddleware } from './cors.middleware';
import { Request, Response, NextFunction } from 'express';

// Mock Request, Response 和 NextFunction
const mockRequest = (method: string, origin?: string): Partial<Request> => ({
  method,
  get: jest.fn().mockReturnValue(origin),
});

const mockResponse = (): Partial<Response> => ({
  setHeader: jest.fn(),
  status: jest.fn().mockReturnThis(),
  end: jest.fn(),
});

const mockNext = jest.fn();

describe('CorsMiddleware', () => {
  let middleware: CorsMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorsMiddleware],
    }).compile();

    middleware = module.get<CorsMiddleware>(CorsMiddleware);
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should set CORS headers for allowed origin', () => {
      const req = mockRequest('GET', 'https://example.com');
      const res = mockResponse();
      const next = mockNext;

      middleware.use(req as Request, res as Response, next);

      expect(req.get).toHaveBeenCalledWith('Origin');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://example.com',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    it('should not set Allow-Origin header for disallowed origin', () => {
      const req = mockRequest('GET', 'https://unauthorized.com');
      const res = mockResponse();
      const next = mockNext;

      middleware.use(req as Request, res as Response, next);

      expect(req.get).toHaveBeenCalledWith('Origin');
      expect(res.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://unauthorized.com',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });

    it('should handle OPTIONS request and end response', () => {
      const req = mockRequest('OPTIONS', 'https://example.com');
      const res = mockResponse();
      const next = mockNext;

      middleware.use(req as Request, res as Response, next);

      expect(req.get).toHaveBeenCalledWith('Origin');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://example.com',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should set headers but not Allow-Origin for OPTIONS with disallowed origin', () => {
      const req = mockRequest('OPTIONS', 'https://unauthorized.com');
      const res = mockResponse();
      const next = mockNext;

      middleware.use(req as Request, res as Response, next);

      expect(req.get).toHaveBeenCalledWith('Origin');
      expect(res.setHeader).not.toHaveBeenCalledWith(
        'Access-Control-Allow-Origin',
        'https://unauthorized.com',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle missing Origin header', () => {
      const req = mockRequest('GET'); // 无 Origin
      const res = mockResponse();
      const next = mockNext;

      middleware.use(req as Request, res as Response, next);

      expect(req.get).toHaveBeenCalledWith('Origin');
      expect(res.setHeader).not.toHaveBeenCalledWith('Access-Control-Allow-Origin', '');
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE',
      );
      expect(res.setHeader).toHaveBeenCalledWith(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization',
      );
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.end).not.toHaveBeenCalled();
    });
  });
});
