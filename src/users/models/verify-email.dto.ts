import { IsString, MinLength, MaxLength } from 'class-validator';

export class VerifyEmailDto {
  @IsString()
  @MinLength(64, { message: 'Token must be 64 characters' })
  @MaxLength(64, { message: 'Token must be 64 characters' })
  token: string;
}

export class VerifyEmailResponseDto {
  emailVerified: boolean;
}
