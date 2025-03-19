import { IsString, MinLength, MaxLength } from 'class-validator';

export class Verify2faDto {
  @IsString()
  @MinLength(6, { message: 'Code must be 6 characters' })
  @MaxLength(6, { message: 'Code must be 6 characters' })
  code: string;
}

export class Verify2faResponseDto {
  isEnabled: boolean;
}