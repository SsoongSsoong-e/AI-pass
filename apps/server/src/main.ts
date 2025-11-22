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
    .setTitle("Cats example")
    .setDescription("The cats API description")
    .setVersion("1.0")
    .addTag("cats")
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, document);
  await app.listen(5002, "0.0.0.0", () => {});
  //await app.listen(443);
}
bootstrap();
