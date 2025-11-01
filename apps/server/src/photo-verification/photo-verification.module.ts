import { Module } from '@nestjs/common';
import { VerificationController } from './photo-verification.controller';
import { VerificationService } from './photo-verification.service';

@Module({
  controllers: [VerificationController],
  providers: [VerificationService],
})
export class VerificationModule { }
