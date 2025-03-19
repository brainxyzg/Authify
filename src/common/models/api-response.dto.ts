import { IsString, IsIn, IsOptional } from 'class-validator';

export class ApiResponse<T = any> {
  @IsString()
  @IsIn(['success', 'error'])
  status: 'success' | 'error';

  @IsOptional()
  data?: T;

  @IsString()
  message: string;

  @IsString()
  code: string;
}
