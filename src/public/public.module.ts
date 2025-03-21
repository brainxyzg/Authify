import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';
import { User } from '../common/entities/user.entity';
import { PasswordReset } from '../common/entities/password-reset.entity';
import { CommonModule } from '../common/common.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, PasswordReset]), CommonModule, MailModule],
  providers: [PublicService],
  controllers: [PublicController],
})
export class PublicModule {}
