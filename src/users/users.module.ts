import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../common/entities/user.entity';
import { EmailVerification } from '../common/entities/email-verification.entity';
import { JwtGuard } from '../common/middleware/jwt.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, EmailVerification]),
    ConfigModule,
    // 添加 JwtModule，以便 JwtService 可以被注入
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1h') 
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    JwtGuard, // 确保 JwtGuard 在 providers 中
  ],
  exports: [UsersService],
})
export class UsersModule {}