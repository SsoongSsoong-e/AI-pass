import { Module } from '@nestjs/common';
import { SocketService} from './socket.service';
import { SocketGateway } from './socket.gateway';
import { SocketLoggingModule } from '../socket-logging/socket-logging.module';

@Module({
  imports: [SocketLoggingModule],
  providers: [SocketGateway],
  
})

export class SocketModule {}
