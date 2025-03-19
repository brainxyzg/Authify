import { IsNumber } from 'class-validator';

export class AssignRoleDto {
  @IsNumber({}, { message: 'Role ID must be a number' })
  roleId: number;
}

export class AssignRoleResponseDto {
  userId: number;
  roleId: number;
}