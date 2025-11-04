import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { SocketModule } from './socket/socket.module';
import { EditModule } from "./photo-edit/photo-edit.module";
import { VerificationModule } from "./photo-verification/photo-verification.module";
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/entities/user.entity'
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    VerificationModule, EditModule, SocketModule, UsersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
