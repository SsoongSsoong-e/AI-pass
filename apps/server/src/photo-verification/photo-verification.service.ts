import { Injectable } from "@nestjs/common";
import * as sharp from "sharp";
import { Buffer } from "buffer";
import axios from "axios";
import * as FormData from "form-data";

@Injectable()
export class VerificationService {
  async getVerification(input: string): Promise<any> {
    const startTime = performance.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`[${requestId}] VERIFICATION_START - inputSize: ${input.length}`);
    
    const decodingStart = performance.now();
    const buffer = Buffer.from(input, "base64");
    const decodingTime = Math.round((performance.now() - decodingStart) * 100) / 100;
    
    const preprocessingResult = await this.preProcessImage(buffer, requestId);
    const inferenceData = await this.loadModelFromEC2(preprocessingResult.data, requestId);
    const result = await this.processResult(inferenceData, requestId);
    
    const totalTime = Math.round((performance.now() - startTime) * 100) / 100;
    const overhead = decodingTime + preprocessingResult.metrics.preprocessingTime + preprocessingResult.metrics.encodingTime;
    console.log(`[${requestId}] VERIFICATION_COMPLETE - totalTime: ${totalTime.toFixed(2)}ms, overhead: ${overhead.toFixed(2)}ms`);
    
    return result.data;
  }

  async loadModelFromEC2(input: Buffer, requestId: string): Promise<any> {
    const modelStart = performance.now();
    try {
      // Binary 데이터를 multipart/form-data로 전송
      const formData = new FormData();
      formData.append('image', input, {
        filename: 'image.png',
        contentType: 'image/png',
      });

      //const response = await axios.post("http://3.37.203.103:5001/process_binary", formData, {
      const response = await axios.post("http://localhost:5001/process_binary", formData, {
        headers: {
          ...formData.getHeaders(),
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      
      const modelTime = Math.round((performance.now() - modelStart) * 100) / 100;
      console.log(`[${requestId}] MODEL_RESPONSE - time: ${modelTime.toFixed(2)}ms ⚡ (Binary mode)`);
      return response.data;
    } catch (error) {
      console.error(`[${requestId}] MODEL_ERROR:`, error.message);
      throw new Error("Model inference failed");
    }
  }

  async preProcessImage(buffer: Buffer, requestId: string): Promise<any> {
    const preprocessStart = performance.now();
    try {
      const pngBuffer = await sharp(buffer)
        .resize({ width: 640, height: 640 }) // 크기 조정
        .png({ quality: 80 }) // 품질 설정
        .toBuffer();
      const preprocessTime = Math.round((performance.now() - preprocessStart) * 100) / 100;
      
      // Base64 인코딩 제거 - Binary 그대로 전송
      const encodingTime = 0; // 인코딩 시간 제거
      
      console.log(`[${requestId}] PREPROCESSING - resize: ${preprocessTime.toFixed(2)}ms, encode: ${encodingTime.toFixed(2)}ms ⚡, size: ${buffer.length} -> ${pngBuffer.length}`);
      
      return {
        data: pngBuffer, // Binary Buffer 반환
        metrics: {
          preprocessingTime: preprocessTime,
          encodingTime: encodingTime,
        },
      };
    } catch (error) {
      console.error(`[${requestId}] PREPROCESSING_ERROR:`, error.message);
      throw new Error("Image preprocessing failed");
    }
  }

  async processResult(
    predictions: any,
    requestId: string
  ): Promise<any> {
    const resultStart = performance.now();
    try {
      // YOLO와 facePredictions 데이터를 분리
      const yolo = predictions.yolo_results.output || [];
      const facePredictions = predictions.mediapipe_results || {};
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
      
      const resultTime = Math.round((performance.now() - resultStart) * 100) / 100;
      console.log(`[${requestId}] RESULT - verification: ${tempVerificationResult.join(",")} (${resultTime.toFixed(2)}ms)`);
      return { data: { tempVerificationResult } };
    } catch (error) {
      console.error(`[${requestId}] RESULT_ERROR:`, error.message);
      throw new Error("Prediction result processing failed");
    }
  }
}
