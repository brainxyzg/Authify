import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('Blacklisted_Tokens')
export class BlacklistedToken {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'bigint', nullable: false })
  userId: number;

  @Column({ type: 'varchar', length: 128, nullable: false })
  tokenIdentifier: string;

  @Column({ type: 'varchar', length: 10, nullable: false, enum: ['access', 'refresh'] })
  tokenType: 'access' | 'refresh';

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  blacklistedAt: Date;

  @Column({ type: 'timestamptz', nullable: false })
  expiresAt: Date;

  @ManyToOne(() => User, user => user.blacklistedTokens, { onDelete: 'CASCADE' })
  user: User;
}
