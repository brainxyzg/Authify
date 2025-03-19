import { IsString, Length, Matches, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiResponse } from '../../common/models/api-response.dto';

// 获取当前用户信息响应
export class UserInfoResponseDto {
  user_id: string;
  username: string;
  email: string;
  roles: string[];
  is_email_verified: boolean;
  two_factor_enabled: boolean;
}

// 更新用户信息请求
export class UpdateUserInfoDto {
  @IsString()
  @Length(3, 50)
  @Matches(/^[a-zA-Z0-9_]+$/)
  @IsOptional()
  username?: string;
}

// 更新用户信息响应
export class UpdateUserInfoResponseDto {
  username: string;
}

// 修改密码请求
export class ChangePasswordDto {
  @IsString()
  @Length(8, 128)
  @IsNotEmpty()
  old_password: string;

  @IsString()
  @Length(8, 128)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
  @IsNotEmpty()
  new_password: string;
}

// 验证邮箱请求
export class VerifyEmailDto {
  @IsString()
  @Length(6, 6)
  @Matches(/^[a-zA-Z0-9]{6}$/)
  @IsNotEmpty()
  code: string;
}

// 验证邮箱响应
export class VerifyEmailResponseDto {
  is_email_verified: boolean;
}

// API 响应类型
export type UserInfoApiResponse = ApiResponse<UserInfoResponseDto | null>;
export type UpdateUserInfoApiResponse = ApiResponse<UpdateUserInfoResponseDto | null>;
export type ChangePasswordApiResponse = ApiResponse<null>;
export type SendVerifyEmailApiResponse = ApiResponse<null>;
export type VerifyEmailApiResponse = ApiResponse<VerifyEmailResponseDto | null>;
