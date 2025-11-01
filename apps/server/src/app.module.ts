import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { SocketModule } from './socket/socket.module';
import { EditModule } from "./photo-edit/photo-edit.module";
import { VerificationModule } from "./photo-verification/photo-verification.module";

@Module({
  imports: [VerificationModule, EditModule, SocketModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
