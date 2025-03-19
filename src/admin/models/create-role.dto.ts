import { IsString, MinLength, MaxLength, Matches, IsOptional } from 'class-validator';

export class CreateRoleDto {
  @IsString()
  @MinLength(3, { message: 'Name must be at least 3 characters' })
  @MaxLength(50, { message: 'Name must not exceed 50 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Name must contain only letters, numbers, or underscores' })
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(255, { message: 'Description must not exceed 255 characters' })
  description?: string;
}

export class CreateRoleResponseDto {
  id: number;
  name: string;
  description?: string;
}