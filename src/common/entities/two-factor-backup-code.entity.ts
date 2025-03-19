import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('Two_Factor_Backup_Codes')
export class TwoFactorBackupCode {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', nullable: false })
  userId: number;

  @Column({ type: 'varchar', length: 128, nullable: false })
  codeHash: string;

  @Column({ type: 'boolean', default: false, nullable: false })
  isUsed: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  usedAt?: Date;

  @ManyToOne(() => User, (user) => user.twoFactorBackupCodes, { onDelete: 'CASCADE' })
  user: User;
}