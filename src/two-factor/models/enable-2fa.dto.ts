import { IsString, Length } from 'class-validator';

export class Enable2FADto {
  @IsString()
  @Length(6, 6)
  code: string; // 用户输入的 TOTP 验证码
}

export class Enable2FAResponseDto {
  secret: string; // 返回给用户用于配置验证器的密钥
  qrCodeUrl: string; // 用于扫描的二维码 URL
}