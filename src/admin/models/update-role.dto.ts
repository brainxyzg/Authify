import { IsString, MaxLength, IsOptional } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description?: string;
}

export class UpdateRoleResponseDto {
  id: number;
  name: string;
  description?: string;
}
