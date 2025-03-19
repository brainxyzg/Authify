import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import nock from 'nock';
import { SsoModule } from '../src/sso/sso.module';
import { User } from '../src/common/entities/user.entity';
import { LoginMethod } from '../src/common/entities/login-method.entity';
import { RefreshToken } from '../src/common/entities/refresh-token.entity'; // 添加 RefreshToken 实体
import { UserRole } from '../src/common/entities/user-role.entity'; // 添加 UserRole 实体
import { Role } from '../src/common/entities/role.entity'; 
import { RedisService } from '../src/common/services/redis.service';
import { SsoProvider } from '../src/sso/models/sso.dto';

describe('SsoController (e2e)', () => {
  let app: INestApplication;
  let redisService: RedisService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: 'test/.env.test',
        }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            type: 'postgres',
            host: config.get('DB_HOST'),
            port: config.get('DB_PORT'),
            username: config.get('DB_USERNAME'),
            password: config.get('DB_PASSWORD'),
            database: config.get('DB_NAME'),
            entities: [User, LoginMethod, RefreshToken, UserRole, Role], // 添加所有相关实体
            synchronize: true,
            dropSchema: true,
          }),
        }),
        TypeOrmModule.forFeature([User, LoginMethod, RefreshToken, UserRole, Role]), // 更新 forFeature
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.get('JWT_SECRET'),
            signOptions: { expiresIn: '1h' },
          }),
        }),
        SsoModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    redisService = moduleFixture.get<RedisService>(RedisService);
    await app.init();

    await redisService.flushAll();
  });

  afterAll(async () => {
    await app.close();
    nock.cleanAll();
  });

  beforeEach(async () => {
    nock.cleanAll();
    const keys = await redisService.client.keys('sso:state:*');
    if (keys.length > 0) {
      await redisService.client.del(keys);
    }
  });

  describe('GET /api/v1/sso/google', () => {
    it('should redirect to Google auth URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sso/google')
        .expect(302);

      const redirectUrl = response.header.location;
      expect(redirectUrl).toContain('https://accounts.google.com/o/oauth2/v2/auth');
      expect(redirectUrl).toContain('client_id=test-google-id');
      expect(redirectUrl).toContain('state=');

      const state = new URL(redirectUrl).searchParams.get('state');
      const storedProvider = await redisService.get(`sso:state:${state}`);
      expect(storedProvider).toBe(SsoProvider.GOOGLE);
    });
  });

  describe('GET /api/v1/sso/google/callback', () => {
    it('should handle Google callback successfully', async () => {
      const state = 'google-test-state';
      await redisService.set(`sso:state:${state}`, SsoProvider.GOOGLE, 60);

      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(200, { access_token: 'google-token' });

      nock('https://www.googleapis.com')
        .get('/oauth2/v2/userinfo')
        .reply(200, { email: 'google@example.com', sub: '12345' });

      const response = await request(app.getHttpServer())
        .get('/api/v1/sso/google/callback')
        .query({ code: 'google-code', state })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.user.email).toBe('google@example.com');

      const storedProvider = await redisService.get(`sso:state:${state}`);
      expect(storedProvider).toBeNull();
    });

    it('should return error for invalid state', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sso/google/callback')
        .query({ code: 'google-code', state: 'invalid-state' })
        .expect(200);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('INVALID_CSRF_STATE');
    });

    it('should return error for invalid code', async () => {
      const state = 'google-test-state';
      await redisService.set(`sso:state:${state}`, SsoProvider.GOOGLE, 600);

      nock('https://oauth2.googleapis.com')
        .post('/token')
        .reply(400, { error: 'invalid_grant' });

      const response = await request(app.getHttpServer())
        .get('/api/v1/sso/google/callback')
        .query({ code: 'invalid-code', state })
        .expect(200);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('INVALID_SSO_CODE');
    });
  });

  describe('GET /api/v1/sso/github', () => {
    it('should redirect to GitHub auth URL', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sso/github')
        .expect(302);

      const redirectUrl = response.header.location;
      expect(redirectUrl).toContain('https://github.com/login/oauth/authorize');
      expect(redirectUrl).toContain('client_id=test-github-id');
      expect(redirectUrl).toContain('state=');

      const state = new URL(redirectUrl).searchParams.get('state');
      const storedProvider = await redisService.get(`sso:state:${state}`);
      expect(storedProvider).toBe(SsoProvider.GITHUB);
    });
  });

  describe('GET /api/v1/sso/github/callback', () => {
    it('should handle GitHub callback successfully', async () => {
      const state = 'github-test-state';
      await redisService.set(`sso:state:${state}`, SsoProvider.GITHUB, 600);

      nock('https://github.com')
        .post('/login/oauth/access_token')
        .reply(200, { access_token: 'github-token' });

      nock('https://api.github.com')
        .get('/user')
        .reply(200, { email: 'github@example.com', id: '67890', login: 'githubuser' });

      const response = await request(app.getHttpServer())
        .get('/api/v1/sso/github/callback')
        .query({ code: 'github-code', state })
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.user.email).toBe('github@example.com');

      const storedProvider = await redisService.get(`sso:state:${state}`);
      expect(storedProvider).toBeNull();
    });

    it('should return error for invalid state', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/sso/github/callback')
        .query({ code: 'github-code', state: 'invalid-state' })
        .expect(200);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('INVALID_CSRF_STATE');
    });

    it('should return error for invalid code', async () => {
      const state = 'github-test-state';
      await redisService.set(`sso:state:${state}`, SsoProvider.GITHUB, 600);

      nock('https://github.com')
        .post('/login/oauth/access_token')
        .reply(400, { error: 'bad_verification_code' });

      const response = await request(app.getHttpServer())
        .get('/api/v1/sso/github/callback')
        .query({ code: 'invalid-code', state })
        .expect(200);

      expect(response.body.status).toBe('error');
      expect(response.body.code).toBe('INVALID_SSO_CODE');
    });
  });
});