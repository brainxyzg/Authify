import { registerAs } from '@nestjs/config';
import { MailConfig } from './config.types';
import { parseNumber, parseString } from '../common/utils/config-utils';

export default registerAs(
  'mail',
  () =>
    ({
      host: parseString(process.env.MAIL_HOST, ''),
      port: parseNumber(process.env.MAIL_PORT, 587, 1, 65535),
      user: parseString(process.env.MAIL_USER, ''),
      pass: parseString(process.env.MAIL_PASS, ''),
      from: parseString(process.env.MAIL_FROM, '"Your App" <no-reply@example.com>'),
    }) as MailConfig,
);
