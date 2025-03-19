import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('Email_Verifications')
export class EmailVerification {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', nullable: false })
  userId: number;

  @Column({ type: 'varchar', length: 64, unique: true, nullable: false })
  token: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  requestedAt: Date;

  @Column({ type: 'timestamptz', nullable: false })
  expiresAt: Date;

  @Column({ type: 'boolean', default: false, nullable: false })
  isUsed: boolean;

  @ManyToOne(() => User, user => user.emailVerifications, { onDelete: 'CASCADE' })
  user: User;
}
