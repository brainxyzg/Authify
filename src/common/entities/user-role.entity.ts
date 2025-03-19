import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Role } from './role.entity';

@Entity('User_Roles')
export class UserRole {
  @PrimaryColumn({ type: 'bigint' })
  userId: number;

  @PrimaryColumn({ type: 'bigint' })
  roleId: number;

  @Column({ type: 'timestamptz', default: () => 'NOW()' })
  assignedAt: Date;

  @ManyToOne(() => User, (user) => user.userRoles, { onDelete: 'CASCADE' })
  user: User;

  @ManyToOne(() => Role, (role) => role.userRoles, { onDelete: 'CASCADE' })
  role: Role;
}