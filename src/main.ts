import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

export function configureApp(app: any) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*',
  });
  app.setGlobalPrefix('api/v1');
}

export async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  configureApp(app);

  try {
    const port = process.env.PORT ?? 3000;
    await app.listen(port, '0.0.0.0');
    Logger.log(`应用程序运行在: ${await app.getUrl()}`, 'Bootstrap');
  } catch (error) {
    Logger.error(`启动失败: ${error.message}`, 'Bootstrap');
    process.exit(1);
  }
}

bootstrap();
