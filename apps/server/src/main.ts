import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Express } from 'express';
import * as path from 'path'; // Import the path module
import * as bodyParser from "body-parser";
import * as session from 'express-session';
import * as connectPgSimple from 'connect-pg-simple';
import * as passport from 'passport';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  // const httpsOptions = {
  //   key: fs.readFileSync(
  //     '/Users/stanhong/school/visionITssu-back/192.168.0.11-key.pem',
  //   ),
  //   cert: fs.readFileSync(
  //     '/Users/stanhong/school/visionITssu-back/192.168.0.11.pem',
  //   ),
  // };

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // httpsOptions,
  });

  const configService = app.get(ConfigService);

  // CORS 설정 (Sub-path 방식: 같은 도메인)
  app.enableCors({
    origin: configService.get<string>('FRONTEND_URL', 'http://localhost:5173'),
    credentials: true,  // 세션 쿠키 전송 (공통 인증 필수)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Set-Cookie'],
  });

  // 세션 스토어 설정 (PostgreSQL)
  const PgSession = connectPgSimple(session);
  const sessionStore = new PgSession({
    conString: `postgresql://${configService.get<string>('DATABASE_USER')}:${configService.get<string>('DATABASE_PASSWORD')}@${configService.get<string>('DATABASE_HOST')}:${configService.get<number>('DATABASE_PORT')}/${configService.get<string>('DATABASE_NAME')}`,
    tableName: 'sessions',
    createTableIfMissing: true,  // 테이블 자동 생성
    pruneSessionInterval: 86400,  // 24시간마다 만료된 세션 삭제
  });

  // 세션 미들웨어 설정 (공통 인증: 모든 경로에 적용)
  app.use(
    session({
      store: sessionStore,
      secret: configService.get<string>('SESSION_SECRET'),
      resave: false,
      saveUninitialized: false,
      name: 'connect.sid',
      cookie: {
        maxAge: configService.get<number>('SESSION_MAX_AGE', 604800) * 1000,
        httpOnly: true,  // XSS 방지
        secure: process.env.NODE_ENV === 'production',  // HTTPS 전용
        sameSite: 'lax',  // CSRF 방지 (Sub-path 방식)
        path: '/',  // 모든 경로에서 쿠키 사용
      },
    })
  );

  // Passport 미들웨어 설정
  app.use(passport.initialize());
  app.use(passport.session());

  // Rolling Session 미들웨어 (모든 API 호출 시 세션 갱신)
  app.use((req, res, next) => {
    if (req.session && req.isAuthenticated && req.isAuthenticated()) {
      req.session.touch();  // 세션 만료 시간 자동 갱신
    }
    next();
  });

  // 본문 파서 설정 (세션 이후에 배치)
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
  app.useStaticAssets(join(__dirname, "../..", "static"));

  const config = new DocumentBuilder()
    .setTitle("AI Pass API")
    .setDescription("AI Pass 여권사진 생성 및 관리 API 문서")
    .setVersion("2.0")
    .addTag("app", "애플리케이션 기본 엔드포인트")
    .addTag("photo-edit", "사진 편집 API")
    .addTag("verification", "사진 검증 API")
    .addTag("socket-logging", "소켓 로깅 API")
    .addTag("socket", "소켓 관련 API")
    .addTag("users", "사용자 관리 API")
    .addTag("auth", "인증 관련 API (Google OAuth)")
    .addTag("passport-photos", "여권 사진 관리 API")
    .addCookieAuth("connect.sid", {
      type: "apiKey",
      in: "cookie",
      name: "connect.sid",
      description: "세션 쿠키 (Google OAuth 로그인 후 자동 설정"
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);
  await app.listen(5002, "0.0.0.0", () => {});
  //await app.listen(443);
}
bootstrap();
