import { Injectable } from "@nestjs/common";
import * as sharp from "sharp";
import { Buffer } from "buffer";
import axios from "axios";

@Injectable()
export class VerificationService {
  async getVerification(input: string): Promise<any> {
    const buffer = Buffer.from(input, "base64");
    const inputData = await this.preProcessImage(buffer);
    const inferenceData = await this.loadModelFromEC2(inputData);
    return await this.processResult(inferenceData);
  }

  async loadModelFromEC2(input: string): Promise<any> {
    try {
      // const response = await axios.post("http://3.37.203.103:5001/process", {
      const response = await axios.post("http://localhost:5001/process", {
        input: input, // Base64 인코딩된 이미지 데이터
      });

      return response.data; // Python에서 반환된 JSON 데이터를 반환
    } catch (error) {
      console.error("Error fetching prediction from model EC2:", error.message);
      throw new Error("Model inference failed");
    }
  }

  async preProcessImage(buffer: Buffer): Promise<string> {
    try {
      const pngBuffer = await sharp(buffer)
        .resize({ width: 640, height: 640 }) // 크기 조정
        .png({ quality: 80 }) // 품질 설정
        .toBuffer();
      return pngBuffer.toString("base64");
    } catch (error) {
      console.error("Error preprocessing image:", error.message);
      throw new Error("Image preprocessing failed");
    }
  }

  async processResult(
    predictions: any
  ): Promise<{ tempVerificationResult: any }> {
    try {
      // YOLO와 facePredictions 데이터를 분리
      const yolo = predictions.yolo_results.output || [];
      const facePredictions = predictions.mediapipe_results || {};
      console.log(predictions);
      let tempVerificationResult = [0, 0, 0, 0, 0]; // 기본값 0으로 초기화

      // 조건 1: YOLO 결과 확인
      if (!yolo || yolo.length === 0) {
        tempVerificationResult[0] = 1; // yolo가 비어있을 경우 1
      } else {
        tempVerificationResult[0] = 1; // yolo에 값이 있으면 1
      }

      // 조건 2: 얼굴 밝기와 눈썹
      if (
        facePredictions.valid_face_brightness === true &&
        facePredictions.valid_eyebrow === true
      ) {
        tempVerificationResult[1] = 1;
      }

      // 조건 3: 얼굴 정면 확인
      if (
        facePredictions.valid_face_horizon === true &&
        facePredictions.valid_face_vertical === true
      ) {
        tempVerificationResult[2] = 1;
      }

      // 조건 4: 표정 확인
      if (
        facePredictions.valid_mouth_openness === true &&
        facePredictions.valid_mouth_smile === true
      ) {
        tempVerificationResult[3] = 1;
      }

      // 조건 5: 얼굴 밝기 단독 확인
      if (facePredictions.valid_face_brightness === true) {
        tempVerificationResult[4] = 1;
      }
      console.log(tempVerificationResult);
      return { tempVerificationResult };
    } catch (error) {
      console.error("Error processing predictions:", error.message);
      throw new Error("Prediction result processing failed");
    }
  }
}
