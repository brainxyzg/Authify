import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { User } from '../src/common/entities/user.entity';

describe('Database Connection (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let configService: ConfigService;

  // 测试前的配置
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: 'test/.env.test', // 使用测试环境的配置文件
        }),
        TypeOrmModule.forRootAsync({
          inject: [ConfigService],
          useFactory: async (config: ConfigService): Promise<TypeOrmModuleOptions> => ({
            type: 'postgres',
            host: config.get('DB_HOST'),
            port: config.get('DB_PORT'),
            username: config.get('DB_USERNAME'),
            password: config.get('DB_PASSWORD'),
            database: config.get('DB_NAME'),
            entities: [User], // 只使用 User 实体测试连接
            synchronize: true, // 自动创建表
            dropSchema: true, // 每次测试前清空表结构
          }),
        }),
        TypeOrmModule.forFeature([User]),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configService = moduleFixture.get<ConfigService>(ConfigService);

    // 打印数据库连接URL
    const dbHost = configService.get('DB_HOST');
    const dbPort = configService.get('DB_PORT');
    const dbUser = configService.get('DB_USERNAME');
    const dbPass = configService.get('DB_PASSWORD');
    const dbName = configService.get('DB_NAME');
    console.log(`数据库连接URL: postgres://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}`);

    await app.init();

    // 获取 TypeORM 的 DataSource 实例
    dataSource = moduleFixture.get(DataSource);
  });

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy(); // 关闭数据库连接
    }
    if (app) {
      // 添加条件检查，防止 app 未定义时调用 close
      await app.close();
    }
  });

  it('should connect to PostgreSQL and perform basic CRUD', async () => {
    // 确认数据库连接已初始化
    expect(dataSource.isInitialized).toBe(true);

    // 打印数据库连接信息
    console.log('数据库连接状态:', dataSource.isInitialized ? '已连接' : '未连接');
    console.log('数据库类型:', dataSource.options.type);
    console.log('数据库名称:', dataSource.options.database);

    // 创建一个测试用户
    const userRepository = dataSource.getRepository(User);
    const testUser = userRepository.create({
      username: 'testuser',
      email: 'test@example.com',
      emailVerified: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // 插入用户
    await userRepository.save(testUser);
    expect(testUser.id).toBeDefined();

    // 查询用户
    const foundUser = await userRepository.findOne({ where: { email: 'test@example.com' } });
    expect(foundUser).toBeDefined();
    expect(foundUser.username).toBe('testuser');
    expect(foundUser.email).toBe('test@example.com');

    // 删除用户
    await userRepository.remove(foundUser);
    const deletedUser = await userRepository.findOne({ where: { email: 'test@example.com' } });
    expect(deletedUser).toBeNull();
  });
});
