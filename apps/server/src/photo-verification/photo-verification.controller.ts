
import { Controller, Post, Body } from "@nestjs/common";
//import { FileInterceptor } from '@nestjs/platform-express';
import { VerificationService } from "./photo-verification.service";

@Controller("verification")
export class VerificationController {
  constructor(private readonly verificationService: VerificationService) {}

  @Post()
  async handleImageUpload(@Body("image") image: string) {
    if (!image) {
      throw new Error("Image data is required");
    }
    // Base64 문자열에서 데이터만 추출 (Data URI 형식일 경우)
    const base64Data = image.split(",")[1];
    return this.verificationService.getVerification(base64Data);
  }
}
