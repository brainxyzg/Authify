import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ContentTypeMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const methods = ['POST', 'PATCH'];
    if (methods.includes(req.method)) {
      const contentType = req.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new HttpException('Unsupported Media Type', HttpStatus.UNSUPPORTED_MEDIA_TYPE);
      }
    }
    res.setHeader('Content-Type', 'application/json');
    next();
  }
}