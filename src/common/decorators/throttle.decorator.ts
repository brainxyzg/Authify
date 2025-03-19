// src/common/decorators/throttle.decorator.ts
import { SetMetadata } from '@nestjs/common';

// 定义元数据的键名
export const THROTTLE_METADATA_KEY = 'throttle';

// Throttle 装饰器，接受 ttl 和 limit 参数
export const Throttle = (ttl: number, limit: number) =>
  SetMetadata(THROTTLE_METADATA_KEY, { ttl, limit });
