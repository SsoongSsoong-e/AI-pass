import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SocketModule } from './socket/socket.module';
import { EditModule } from './photo-edit/photo-edit.module';
import { VerificationModule } from './photo-verification/photo-verification.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PassportPhotosModule } from './passport-photos/passport-photos.module';
import { S3Module } from './s3/s3.module';
import appConfig from './config/env.config';
import { validateEnvVariables } from './config/env.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      load: [appConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService], 
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        return {
          type: 'postgres',
          host: configService.get<string>('DATABASE_HOST', 'localhost'),
          port: Number(configService.get<string>('DATABASE_PORT','5432')),
          username: configService.get<string>('DATABASE_USER', 'postgres'),
          password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
          database: configService.get<string>('DATABASE_NAME', 'postgres'),
          autoLoadEntities: true,
          synchronize: !isProduction,
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const mongoHost = configService.get<string>('MONGO_HOST', 'localhost');
        const mongoPort = configService.get<string>('MONGO_PORT', '27017');
        const mongoDatabase = configService.get<string>('MONGO_DATABASE', 'ai-pass');
        return {
          uri: `mongodb://${mongoHost}:${mongoPort}/${mongoDatabase}`,
        };
      },
    }),
    VerificationModule,
    EditModule,
    SocketModule,
    UsersModule,
    AuthModule,
    PassportPhotosModule,
    S3Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const nodeEnv = process.env.NODE_ENV || 'development';
    const isProduction = nodeEnv === 'production';
    
    // 환경 변수 검증 (애플리케이션 시작 시)
    const config = this.configService.get('app');
    const validation = validateEnvVariables(config || {});

    if (!validation.isValid) {
      console.error('\n❌ 필수 환경 변수가 설정되지 않았습니다:');
      validation.missing.forEach((key) => {
        console.error(`   - ${key}`);
      });
      
      console.error('\n💡 해결 방법:');
      if (isProduction) {
        console.error('   프로덕션 환경:');
        console.error('   1. 환경 변수를 직접 설정하거나');
        console.error('   2. .env 파일을 생성하여 설정');
        console.error('   3. docker-compose.yml의 environment 섹션 확인');
      } else {
        console.error('   개발 환경:');
        console.error('   1. 프로젝트 루트에 .env 파일 생성');
        console.error('   2. cp .env.example .env 명령어로 복사');
        console.error('   3. .env 파일에 필수 환경 변수 값 입력');
      }
      console.error('   4. 자세한 내용은 docs/ENV_VARIABLES.md 참고\n');
      
      // 프로덕션에서는 에러, 개발 환경에서는 경고
      if (isProduction) {
        throw new Error(`필수 환경 변수가 누락되었습니다: ${validation.missing.join(', ')}`);
      } else {
        console.warn('⚠️  개발 환경이므로 계속 진행하지만, 일부 기능이 동작하지 않을 수 있습니다.\n');
      }
    } else {
      const envInfo = isProduction ? '프로덕션' : '개발';
      console.log(`✅ 환경 변수 검증 완료 (${envInfo} 환경)\n`);
    }
  }
}
