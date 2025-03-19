"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const jwt_guard_1 = require("./common/middleware/jwt.guard");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // 启用全局验证管道
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true, // 过滤掉未在DTO中声明的属性
        transform: true, // 自动转换类型
        forbidNonWhitelisted: true, // 禁止未在DTO中声明的属性
    }));
    // 启用CORS
    app.enableCors();
    app.useGlobalGuards(app.get(jwt_guard_1.JwtGuard));
    // 设置全局前缀
    app.setGlobalPrefix('api/v1');
    await app.listen(process.env.PORT ?? 3000);
    console.log(`应用程序运行在: ${await app.getUrl()}`);
}
bootstrap();
//# sourceMappingURL=main.js.map