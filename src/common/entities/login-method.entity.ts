import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Unique,
} from 'typeorm';
import { User } from './user.entity';

@Entity('Login_Methods')
@Unique(['provider', 'providerUserId'])
export class LoginMethod {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', nullable: false })
  userId: number;

  @Column({ type: 'varchar', length: 50, nullable: false, enum: ['google', 'github'] })
  provider: 'google' | 'github';

  @Column({ type: 'varchar', length: 100, nullable: false })
  providerUserId: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @ManyToOne(() => User, user => user.loginMethods, { onDelete: 'CASCADE' })
  user: User;
}
