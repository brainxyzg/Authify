import { registerAs } from '@nestjs/config';
import { DatabaseConfig } from './config.types';
import { parseNumber, parseString } from '../common/utils/config-utils';

export default registerAs(
  'database',
  () =>
    ({
      type: parseString(process.env.DATABASE_TYPE, 'postgres', ['postgres', 'mysql', 'sqlite']),
      host: parseString(process.env.DB_HOST, 'localhost'),
      port: parseNumber(process.env.DB_PORT, 5432, 1, 65535),
      username: parseString(process.env.DB_USERNAME, ''),
      password: parseString(process.env.DB_PASSWORD, ''),
      database: parseString(process.env.DB_NAME, ''),
    }) as DatabaseConfig,
);
