import { Module, Global } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailConfig } from '../config/config.types';
import { join } from 'path';

@Global()
@Module({
  imports: [
    ConfigModule,
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mailConfig = configService.get<MailConfig>('mail');
        return {
          transport: {
            host: mailConfig.host,
            port: mailConfig.port,
            secure: mailConfig.port === 465, // 使用 SSL/TLS
            auth: {
              user: mailConfig.user,
              pass: mailConfig.pass,
            },
          },
          defaults: {
            from: mailConfig.from,
          },
          template: {
            dir: join(__dirname, '..', 'templates'), // 模板目录
            adapter: new HandlebarsAdapter(), // 使用 Handlebars 模板引擎
            options: { strict: true },
          },
        };
      },
    }),
  ],
  exports: [MailerModule],
})
export class MailModule {}
