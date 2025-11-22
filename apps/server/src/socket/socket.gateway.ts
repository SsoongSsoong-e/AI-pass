import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";

@WebSocketGateway({
  namespace: "socket",
  cors: { origin: "*" },
})
export class SocketGateway {
  @WebSocketServer()
  server: Server;

  async handleDisconnect(client: Socket) {
    const clientDirectory = path.join(
      process.cwd(),
      "src",
      "socket_temp",
      client.id // 클라이언트별 폴더 삭제
    );
    await fs.promises.rm(clientDirectory, { recursive: true, force: true });
  }

  async loadModelFromEC2(input: string): Promise<any> {
    try {
      //const response = await axios.post("http://172.0.0.1:5001/process", {
        const response = await axios.post("http://localhost:5001/process", {
        input: input, // Base64 인코딩된 이미지 데이터
      });
      return response.data; // Python에서 반환된 JSON 데이터를 반환
    } catch (error) {
      console.error("Error fetching prediction from model EC2:", error.message);
      throw new Error("Model inference failed");
    }
  }

  async processResult(
    predictions: any
  ): Promise<number[]>  {
    try {
      // YOLO와 facePredictions 데이터를 분리
      const yolo = predictions.yolo_results.output || [];
      const facePredictions = predictions.mediapipe_results || {};
      //console.log(yolo);
      //console.log(facePredictions);
      let tempVerificationResult = [0, 0, 0, 0, 0]; // 기본값 0으로 초기화

      // 조건 1: YOLO 결과 확인
      if (!yolo || yolo.length === 0) {
        tempVerificationResult[0] = 1; // yolo가 비어있을 경우 1
      } else {
        tempVerificationResult[0] = 0; // yolo에 값이 있으면 1
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
        facePredictions.valid_mouth_smile === true &&
        facePredictions.valid_eye_openness === true
      ) {
        tempVerificationResult[3] = 1;
      }

      // 조건 5: 얼굴 밝기 단독 확인
      if (facePredictions.valid_face_brightness === true) {
        tempVerificationResult[4] = 1;
      }

      console.log("Final Verification Result:", tempVerificationResult);
      //console.log("Processed Data:", tempVerificationResult);

      return tempVerificationResult;
    } catch (error) {
      console.error("Error processing predictions:", error.message);
      throw new Error("Prediction result processing failed");
    }
  }

  @SubscribeMessage("stream")
  async handleStream(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: any
  ): Promise<any> {
    const imageBlob = message.image.replace(/^data:image\/\w+;base64,/, "");

    // Base64 유효성 검사
    if (!imageBlob || !imageBlob.startsWith("/9j/")) {
      client.emit("stream", { error: "Invalid image data" });
      return;
    }

    const uniqueId = `${Date.now()}_${client.id}`;
    const fileName = `${uniqueId}.txt`;
    const tempFilePath = path.join(
      process.cwd(),
      "src",
      "socket_temp",
      fileName
    );

    await fs.promises.mkdir(path.dirname(tempFilePath), { recursive: true });
    await fs.promises.writeFile(tempFilePath, imageBlob, "utf8");

    if (imageBlob) {
      try {
        Promise.all([this.loadModelFromEC2(imageBlob)])
          .then(async (result) => {
            const tempVerificationResult = await this.processResult(result[0]);
            client.emit("stream", {
              tempVerificationResult,
            });
          })
          .catch((error) => {
            console.error("Error processing validation:", error);
            client.emit("stream:error", {
              error: error.message || "Validation failed",
            });
          });
      } catch (error) {
        console.error("Error processing validation:", error);
        client.emit("stream", { error: error.message || "Validation failed" });
      } finally {
        // 임시 파일 삭제
        await fs.promises
          .unlink(tempFilePath)
          .catch((err) => console.error("Failed to delete temp file:", err));
      }
    }
  }
}
