import { IsString, Matches, Length, IsNotEmpty } from 'class-validator';
import { ApiResponse } from '../../common/models/api-response.dto';

// 启用 2FA 响应
export class Enable2FAResponseDto {
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}

// 验证 2FA 请求
export class Verify2FADto {
  @IsString()
  @Length(6, 6)
  @Matches(/^\d{6}$/)
  @IsNotEmpty()
  code: string;
}

// 验证 2FA 响应
export class Verify2FAResponseDto {
  two_factor_enabled: boolean;
}

// 生成备份码响应
export class GenerateBackupCodesResponseDto {
  backup_codes: string[];
}

// API 响应类型
export type Enable2FAApiResponse = ApiResponse<Enable2FAResponseDto | null>;
export type Verify2FAApiResponse = ApiResponse<Verify2FAResponseDto | null>;
export type Disable2FAApiResponse = ApiResponse<null>;
export type GenerateBackupCodesApiResponse = ApiResponse<GenerateBackupCodesResponseDto | null>;
