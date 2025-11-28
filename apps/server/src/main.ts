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
import { AuthModule } from './auth/auth.module';
import { SessionSerializer } from './auth/serializers/passport.serializer';

async function bootstrap() {
  console.log('🚀 [Bootstrap] 서버 시작 중...');
  console.log(`   - NODE_ENV: ${process.env.NODE_ENV || '(설정되지 않음)'}`);
  
  // const httpsOptions = {
  //   key: fs.readFileSync(
  //     '/Users/stanhong/school/visionITssu-back/192.168.0.11-key.pem',
  //   ),
  //   cert: fs.readFileSync(
  //     '/Users/stanhong/school/visionITssu-back/192.168.0.11.pem',
  //   ),
  // };

  console.log('📦 [Bootstrap] NestFactory.create 호출 중...');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // httpsOptions,
  });
  console.log('✅ [Bootstrap] NestFactory.create 완료');

  const configService = app.get(ConfigService);
  console.log('✅ [Bootstrap] ConfigService 획득 완료');

  // Global Prefix 설정: 모든 API 경로에 /api prefix 자동 적용
  app.setGlobalPrefix('api');

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
        maxAge: configService.get<number>('SESSION_MAX_AGE', 1800) * 1000,
        httpOnly: true,  // XSS 방지
        secure: process.env.NODE_ENV === 'production',  // HTTPS 전용
        sameSite: 'lax',  // CSRF 방지 (Sub-path 방식)
        path: '/',  // 모든 경로에서 쿠키 사용
      },
    })
  );

  // Passport 미들웨어 설정
  app.use(passport.initialize());
  
  // SessionSerializer를 Passport에 등록
  try {
    // AuthModule에서 SessionSerializer 가져오기
    const authModuleRef = app.select(AuthModule);
    const sessionSerializer = authModuleRef.get(SessionSerializer, { strict: false });
    
    // Passport에 serializer 등록
    passport.serializeUser(sessionSerializer.serializeUser.bind(sessionSerializer));
    passport.deserializeUser(sessionSerializer.deserializeUser.bind(sessionSerializer));
    console.log('✅ [main.ts] SessionSerializer가 Passport에 등록되었습니다.');
  } catch (error) {
    console.error('❌ [main.ts] SessionSerializer 등록 실패:', error);
    // SessionSerializer 등록 실패해도 계속 진행 (에러 발생 시 로그만 출력)
  }
  
  // passport.session() 미들웨어 적용 (항상 실행)
  app.use((req, res, next) => {
    // OAuth 경로와 Swagger 경로는 세션 인증이 필요 없으므로 미들웨어를 아예 실행하지 않음
    const isAuthPath = req.path?.startsWith('/auth/google') || req.path === '/auth/google/callback';
    const isSwaggerPath = req.path?.startsWith('/api/docs') || req.path?.startsWith('/docs');
    
    if (isAuthPath || isSwaggerPath) {
      // OAuth 경로와 Swagger 경로만 passport.session() 미들웨어를 우회
      console.log('⏭️ [main.ts] passport.session() 우회, path:', req.path);
      return next();
    }
    // 다른 경로는 passport.session() 적용
    console.log('🔄 [main.ts] passport.session() 실행, path:', req.path, 'sessionID:', req.sessionID);
    passport.session()(req, res, (err) => {
      if (err) {
        // 세션 복원 실패는 에러로 처리하지 않고 계속 진행
        // (세션이 없는 경우는 정상적인 상황일 수 있음)
        console.warn('⚠️ [main.ts] passport.session() 경고:', err.message);
        // 에러를 next()로 전달하지 않고 계속 진행
        // AuthenticatedGuard에서 req.user를 확인할 것임
        return next();
      }
      console.log('✅ [main.ts] passport.session() 완료, req.user:', req.user ? req.user.email : 'null');
      next();
    });
  });

  // Rolling Session 미들웨어 (모든 API 호출 시 세션 갱신)
  app.use((req, res, next) => {
    // 세션이 있고 사용자가 인증된 경우에만 세션 갱신
    if (req.session && req.user) {
      req.session.touch();  // 세션 만료 시간 자동 갱신
    }
    next();
  });

  // 본문 파서 설정 (세션 이후에 배치)
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
  app.useStaticAssets(join(__dirname, "../..", "static"));

  // Swagger 설정: 개발 환경에서만 활성화
  // 환경 변수 확인 순서: process.env.NODE_ENV -> ConfigService -> 기본값 'development'
  const nodeEnvFromEnv = process.env.NODE_ENV;
  const nodeEnvFromConfig = configService.get<string>('NODE_ENV');
  const nodeEnv = nodeEnvFromEnv || nodeEnvFromConfig || 'development';
  const isDevelopment = nodeEnv !== 'production';
  
  // 상세한 디버깅 정보 출력
  console.log('🔍 [Swagger 설정] 환경 변수 확인:');
  console.log(`   - process.env.NODE_ENV: ${nodeEnvFromEnv || '(설정되지 않음)'}`);
  console.log(`   - configService.NODE_ENV: ${nodeEnvFromConfig || '(설정되지 않음)'}`);
  console.log(`   - 최종 NODE_ENV: ${nodeEnv}`);
  console.log(`   - 개발 모드 여부: ${isDevelopment}`);
  
  if (isDevelopment) {
    // Swagger 설정 빌더 생성
    const swaggerBuilder = new DocumentBuilder()
      .setTitle("AI Pass API")
      .setDescription("AI Pass 여권사진 생성 및 관리 API 문서")
      .setVersion("2.0")
      .addTag("photo-edit", "사진 편집 API")
      .addTag("verification", "사진 검증 API")
      .addTag("users", "사용자 관리 API")
      .addTag("auth", "인증 관련 API (Google OAuth)")
      .addTag("passport-photos", "여권 사진 관리 API")
      .addCookieAuth("connect.sid", {
        type: "apiKey",
        in: "cookie",
        name: "connect.sid",
        description: "세션 쿠키 (Google OAuth 로그인 후 자동 설정)"
      });

    const config = swaggerBuilder.build();
    const document = SwaggerModule.createDocument(app, config);

    // Swagger 설정 옵션 (개발 환경에서만 /api/docs로 접근 가능)
    // SwaggerModule.setup은 global prefix를 자동으로 적용하지 않으므로
    // 전체 경로를 명시적으로 지정해야 합니다
    SwaggerModule.setup("api/docs", app, document, {
      swaggerOptions: {
        persistAuthorization: true, // 인증 정보 유지
      },
    });
    
    console.log('📚 Swagger UI가 활성화되었습니다: /api/docs');
  } else {
    console.log('🔒 프로덕션 환경: Swagger UI가 비활성화되었습니다.');
  }

  // 포트 설정: SERVER_PORT 환경 변수가 있으면 우선 사용, 없으면 5002를 기본값으로 사용
  // 개발/프로덕션 환경 모두 5002 포트로 통일
  const port = process.env.SERVER_PORT 
    ? parseInt(process.env.SERVER_PORT, 10)
    : (configService.get<number>('SERVER_PORT') || 5002);
  console.log(`🌐 [Bootstrap] 포트 ${port}에서 서버 시작 중...`);
  await app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server is running on port ${port}`);
    console.log(`📚 Swagger 접근 경로: http://0.0.0.0:${port}/api/docs`);
  });
}

console.log('📝 [main.ts] bootstrap 함수 호출 시작');
bootstrap().catch((error) => {
  console.error('❌ [Bootstrap] 서버 시작 실패:', error);
  process.exit(1);
});
