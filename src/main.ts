import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // CORS 配置（生产环境应限制 origin）
  app.enableCors({
    origin: process.env.CORS_ORIGIN || '*', // 从环境变量读取
  });

  // 全局前缀
  app.setGlobalPrefix('api/v1');

  // 启动服务器并添加错误处理
  try {
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    Logger.log(`应用程序运行在: ${await app.getUrl()}`, 'Bootstrap');
  } catch (error) {
    Logger.error(`启动失败: ${error.message}`, 'Bootstrap');
    process.exit(1);
  }
}
bootstrap();
