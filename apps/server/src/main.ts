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
  app.enableCors({
    origin: "*",
  });


  // 본문 크기 제한 설정 (50MB로 설정 예시)
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
