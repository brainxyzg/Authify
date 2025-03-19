import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('Two_Factor_Settings')
export class TwoFactorSetting {
  @PrimaryColumn()
  userId: number;

  @ManyToOne(() => User, user => user.twoFactorSetting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  secret: string;

  @Column({ default: false })
  isEnabled: boolean;

  @Column({ nullable: true })
  enabledAt: Date;
}