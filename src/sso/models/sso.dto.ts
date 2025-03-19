import { IsString, Length, IsEnum, IsOptional } from 'class-validator';
import { ApiResponse } from '../../common/models/api-response.dto';

// SSO 提供商枚举
export enum SsoProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
}

// 发起 SSO 请求路径参数
export class InitiateSsoDto {
  @IsString()
  @Length(5, 20)
  @IsEnum(SsoProvider)
  provider: SsoProvider;
}

// SSO 回调查询参数
export class SsoCallbackDto {
  @IsString()
  @Length(10, 255)
  code: string;

  @IsString()
  @Length(32, 128)
  @IsOptional()
  state?: string;
}

// SSO 回调响应
export class SsoCallbackResponseDto {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  user: {
    username: string;
    email: string;
  };
}

// API 响应类型
export type SsoInitiateApiResponse = ApiResponse<null>; // 重定向不返回 JSON
export type SsoCallbackApiResponse = ApiResponse<SsoCallbackResponseDto | null>;
