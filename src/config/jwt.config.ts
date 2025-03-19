import { registerAs } from '@nestjs/config';
import { JwtConfig } from './config.types';
import { parseString } from '../common/utils/config-utils';

export default registerAs(
  'jwt',
  () =>
    ({
      secret: parseString(process.env.JWT_SECRET, ''),
      accessTokenExpiration: parseString(process.env.JWT_ACCESS_TOKEN_EXPIRATION, '1h'),
      refreshTokenExpiration: parseString(process.env.JWT_REFRESH_TOKEN_EXPIRATION, '7d'),
      algorithm: parseString(process.env.JWT_ALGORITHM, 'HS256', ['HS256', 'HS384', 'HS512']),
    }) as JwtConfig,
);
