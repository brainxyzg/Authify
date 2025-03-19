import { IsString, MinLength, MaxLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(50, { message: 'Username must not exceed 50 characters' })
  username: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password: string;

  @IsString()
  @IsOptional()
  @MinLength(6, { message: 'Two-factor code must be 6 characters' })
  @MaxLength(6, { message: 'Two-factor code must be 6 characters' })
  twoFactorCode?: string;
}

export class LoginResponseDto {
  accessToken: string;
  tokenType: string;
  refreshToken: string;
  expiresIn: number;
}
