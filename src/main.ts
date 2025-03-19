import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { JwtGuard } from './common/middleware/jwt.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用全局验证管道
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // 过滤掉未在DTO中声明的属性
    transform: true, // 自动转换类型
    forbidNonWhitelisted: true, // 禁止未在DTO中声明的属性
  }));
  
  // 启用CORS
  app.enableCors();

  app.useGlobalGuards(app.get(JwtGuard));

  // 设置全局前缀
  app.setGlobalPrefix('api/v1');
  
  await app.listen(process.env.PORT ?? 3000);
  console.log(`应用程序运行在: ${await app.getUrl()}`);
}
bootstrap();