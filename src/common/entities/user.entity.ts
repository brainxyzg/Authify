import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { UserRole } from './user-role.entity';
import { RefreshToken } from './refresh-token.entity';
import { BlacklistedToken } from './blacklisted-token.entity';
import { TwoFactorSetting } from './two-factor-setting.entity';
import { TwoFactorBackupCode } from './two-factor-backup-code.entity';
import { EmailVerification } from './email-verification.entity';
import { PasswordReset } from './password-reset.entity';
import { LoginMethod } from './login-method.entity';

@Entity('Users')
export class User {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  email: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: false })
  username: string;

  @Column({ type: 'varchar', length: 60, nullable: false })
  passwordHash: string;

  @Column({ type: 'boolean', default: true, nullable: false })
  isActive: boolean;

  @Column({ type: 'boolean', default: false, nullable: false })
  emailVerified: boolean;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;

  @OneToMany(() => UserRole, userRole => userRole.user)
  userRoles: UserRole[];

  @OneToMany(() => RefreshToken, refreshToken => refreshToken.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => BlacklistedToken, blacklistedToken => blacklistedToken.user)
  blacklistedTokens: BlacklistedToken[];

  @OneToOne(() => TwoFactorSetting, twoFactorSetting => twoFactorSetting.user)
  twoFactorSetting?: TwoFactorSetting;

  @OneToMany(() => TwoFactorBackupCode, backupCode => backupCode.user)
  twoFactorBackupCodes: TwoFactorBackupCode[];

  @OneToMany(() => EmailVerification, emailVerification => emailVerification.user)
  emailVerifications: EmailVerification[];

  @OneToMany(() => PasswordReset, passwordReset => passwordReset.user)
  passwordResets: PasswordReset[];

  @OneToMany(() => LoginMethod, loginMethod => loginMethod.user)
  loginMethods: LoginMethod[];
}
