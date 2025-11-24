import { Module } from '@nestjs/common';
import { SocketLoggingService } from './socket-logging.service';

@Module({
  providers: [SocketLoggingService],
  exports: [SocketLoggingService],
})
export class SocketLoggingModule {}

