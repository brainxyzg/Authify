import { Test, TestingModule } from '@nestjs/testing';
import { ContentTypeMiddleware } from './content-type.middleware';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

// Mock Request, Response 和 NextFunction
const mockRequest = (method: string, contentType?: string): Partial<Request> => ({
  method,
  get: jest.fn().mockReturnValue(contentType),
});

const mockResponse = (): Partial<Response> => ({
  setHeader: jest.fn(),
});

const mockNext = jest.fn();

describe('ContentTypeMiddleware', () => {
  let middleware: ContentTypeMiddleware;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContentTypeMiddleware],
    }).compile();

    middleware = module.get<ContentTypeMiddleware>(ContentTypeMiddleware);
    jest.clearAllMocks();
  });

  describe('use', () => {
    it('should call next() for GET requests without checking Content-Type', () => {
      const req = mockRequest('GET');
      const res = mockResponse();
      const next = mockNext;

      middleware.use(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(req.get).not.toHaveBeenCalled();
    });

    it('should call next() for POST requests with valid application/json Content-Type', () => {
      const req = mockRequest('POST', 'application/json');
      const res = mockResponse();
      const next = mockNext;

      middleware.use(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(req.get).toHaveBeenCalledWith('Content-Type');
    });

    it('should throw Unsupported Media Type for POST requests without Content-Type', () => {
      const req = mockRequest('POST');
      const res = mockResponse();
      const next = mockNext;

      expect(() => middleware.use(req as Request, res as Response, next)).toThrow(
        new HttpException('Unsupported Media Type', HttpStatus.UNSUPPORTED_MEDIA_TYPE),
      );
      expect(req.get).toHaveBeenCalledWith('Content-Type');
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should throw Unsupported Media Type for PATCH requests with invalid Content-Type', () => {
      const req = mockRequest('PATCH', 'text/plain');
      const res = mockResponse();
      const next = mockNext;

      expect(() => middleware.use(req as Request, res as Response, next)).toThrow(
        new HttpException('Unsupported Media Type', HttpStatus.UNSUPPORTED_MEDIA_TYPE),
      );
      expect(req.get).toHaveBeenCalledWith('Content-Type');
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should call next() for PATCH requests with valid application/json Content-Type', () => {
      const req = mockRequest('PATCH', 'application/json');
      const res = mockResponse();
      const next = mockNext;

      middleware.use(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
      expect(req.get).toHaveBeenCalledWith('Content-Type');
    });

    it('should handle POST with multipart Content-Type by throwing exception', () => {
      const req = mockRequest('POST', 'multipart/form-data');
      const res = mockResponse();
      const next = mockNext;

      expect(() => middleware.use(req as Request, res as Response, next)).toThrow(
        new HttpException('Unsupported Media Type', HttpStatus.UNSUPPORTED_MEDIA_TYPE),
      );
      expect(req.get).toHaveBeenCalledWith('Content-Type');
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });
  });
});
