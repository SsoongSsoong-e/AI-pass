import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { OAuthAccount } from '../users/entities/oauth-account.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleStrategy } from './strategies/google.strategy';
import { SessionSerializer } from './serializers/passport.serializer';

/**
 * AuthModule
 * 
 * OAuth 인증 관련 모듈
 */
@Module({
  imports: [
    ConfigModule, // 환경 변수 접근
    PassportModule.register({ defaultStrategy: 'google' }),
    TypeOrmModule.forFeature([User, OAuthAccount]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    SessionSerializer,
  ],
  exports: [AuthService],
})
export class AuthModule {}

