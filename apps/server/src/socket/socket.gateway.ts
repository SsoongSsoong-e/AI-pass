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
import axios from "axios";
import { SocketLoggingService } from "../socket-logging/socket-logging.service";
import { RequestHistoryItem } from "../socket-logging/interfaces/request-history-item.interface";

// 인터페이스 정의
interface RequestState {
  abortController: AbortController;
  imageBlob: string | null;
  requestId: string;
  timestamp: number;
  status: "pending" | "completed-success" | "completed-failed" | "failed";
  verificationResult?: number[];
  startTime: number;
  client: Socket; // 클라이언트 참조
}

interface ClientMemoryState {
  imageBlob: string | null;
  lastRequestId: string | null;
  memoryUsage: number;
}

interface RequestQueue {
  queue: RequestState[];
  processing: RequestState | null;
}

@WebSocketGateway({
  namespace: "socket",
  cors: { origin: "*" },
})
export class SocketGateway {
  @WebSocketServer()
  server: Server;

  // SocketLoggingService 주입
  constructor(private readonly loggingService: SocketLoggingService) {}

  // 클래스 레벨 저장소
  private requestQueues: Map<string, RequestQueue> = new Map();
  private clientMemory: Map<string, ClientMemoryState> = new Map();

  async handleDisconnect(client: Socket) {
    const clientId = client.id;

    // 큐에 있는 모든 요청 취소
    const queue = this.requestQueues.get(clientId);
    if (queue) {
      // 진행 중인 요청 취소
      if (queue.processing) {
        queue.processing.abortController.abort();
        this.releaseMemory(clientId, queue.processing);
      }

      // 큐에 있는 모든 요청 취소
      queue.queue.forEach((request) => {
        request.abortController.abort();
        this.releaseMemory(clientId, request);
      });

      this.requestQueues.delete(clientId);
    }

    // 메모리 정리
    this.clientMemory.delete(clientId);

    // 로그 및 히스토리 파일 저장
    await this.loggingService.saveClientData(clientId);
  }

  /**
   * 메모리 해제
   */
  private releaseMemory(clientId: string, requestState: RequestState): void {
    requestState.imageBlob = null;
    this.clientMemory.set(clientId, {
      imageBlob: null,
      lastRequestId: requestState.requestId,
      memoryUsage: 0,
    });
  }

  async loadModelFromEC2(
    input: string,
    abortSignal: AbortSignal
  ): Promise<any> {
    try {
      const response = await axios.post(
        "http://localhost:5001/process",
        {
          input: input,
        },
        {
          signal: abortSignal,
          timeout: 10000,
        }
      );
      return response.data;
    } catch (error: any) {
      if (
        error.name === "AbortError" ||
        error.name === "CanceledError" ||
        error.code === "ERR_CANCELED"
      ) {
        throw new Error("Request canceled");
      }
      if (error.code === "ECONNABORTED") {
        throw new Error("Request timeout");
      }
      console.error("Error fetching prediction from model EC2:", error.message);
      throw new Error("Model inference failed");
    }
  }

  async processResult(predictions: any): Promise<number[]> {
    try {
      const yolo = predictions.yolo_results.output || [];
      const facePredictions = predictions.mediapipe_results || {};
      let tempVerificationResult = [0, 0, 0, 0, 0];

      // 조건 1: YOLO 결과 확인
      if (!yolo || yolo.length === 0) {
        tempVerificationResult[0] = 1;
      } else {
        tempVerificationResult[0] = 0;
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

      return tempVerificationResult;
    } catch (error: any) {
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
    const clientId = client.id;

    // Base64 유효성 검사
    if (!imageBlob || !imageBlob.startsWith("/9j/")) {
      this.loggingService.addLog(clientId, "error", "Invalid image data");
      client.emit("stream", { error: "Invalid image data" });
      return;
    }

    // 새 요청 생성
    const abortController = new AbortController();
    const requestId = `${Date.now()}_${client.id}`;
    const startTime = Date.now();

    const requestState: RequestState = {
      abortController,
      imageBlob,
      requestId,
      timestamp: Date.now(),
      status: "pending",
      startTime,
      client,
    };

    // 큐에 추가
    const queue = this.requestQueues.get(clientId) || {
      queue: [],
      processing: null,
    };
    queue.queue.push(requestState);
    this.requestQueues.set(clientId, queue);

    // 메모리에 Base64 저장
    this.clientMemory.set(clientId, {
      imageBlob,
      lastRequestId: requestId,
      memoryUsage: imageBlob.length,
    });

    // 히스토리에 추가
    this.loggingService.addHistory(clientId, {
      requestId,
      timestamp: Date.now(),
      status: "pending",
      memoryUsed: imageBlob.length,
    });

    // 로깅
    this.loggingService.addLog(clientId, "info", "요청 시작", requestId, {
      imageSize: imageBlob.length,
    });

    // 처리 중인 요청이 없으면 처리 시작
    if (!queue.processing) {
      this.processNextRequest(clientId);
    }
  }

  /**
   * 큐에서 다음 요청 처리
   */
  private async processNextRequest(clientId: string): Promise<void> {
    const queue = this.requestQueues.get(clientId);
    if (!queue || queue.queue.length === 0) {
      return; // 큐가 비어있음
    }

    // 큐에서 꺼내기
    const requestState = queue.queue.shift()!;
    queue.processing = requestState;

    try {
      // 모델 서버에 요청
      const result = await this.loadModelFromEC2(
        requestState.imageBlob!,
        requestState.abortController.signal
      );

      const verificationResult = await this.processResult(result);
      const isSuccess = verificationResult.every((item) => item === 1);
      const duration = Date.now() - requestState.startTime;

      if (isSuccess) {
        requestState.status = "completed-success";
      } else {
        requestState.status = "completed-failed";
      }

      requestState.verificationResult = verificationResult;

      // 메모리 해제
      this.releaseMemory(clientId, requestState);

      // 히스토리 업데이트
      this.loggingService.updateHistory(clientId, requestState.requestId, {
        status: isSuccess ? "completed" : "failed",
        verificationResult,
        duration,
      });

      // 로깅
      this.loggingService.addLog(
        clientId,
        "info",
        isSuccess ? "검증 성공" : "검증 실패",
        requestState.requestId,
        {
          verificationResult,
          isSuccess,
          duration,
        }
      );

      // 클라이언트에 결과 전송
      requestState.client.emit("stream", {
        tempVerificationResult: verificationResult,
      });

      // 다음 요청 처리
      queue.processing = null;
      if (queue.queue.length > 0) {
        this.processNextRequest(clientId);
      }
    } catch (error: any) {
      // 요청이 취소된 경우 무시
      if (
        error.message === "Request canceled" ||
        error.name === "AbortError" ||
        error.name === "CanceledError" ||
        error.code === "ERR_CANCELED"
      ) {
        this.loggingService.addLog(
          clientId,
          "debug",
          "요청 취소됨",
          requestState.requestId
        );
        // 다음 요청 처리
        queue.processing = null;
        if (queue.queue.length > 0) {
          this.processNextRequest(clientId);
        }
        return;
      }

      // 실제 에러 처리
      requestState.status = "failed";

      // 메모리 해제
      this.releaseMemory(clientId, requestState);

      // 히스토리 업데이트
      this.loggingService.updateHistory(clientId, requestState.requestId, {
        status: "failed",
        duration: Date.now() - requestState.startTime,
      });

      // 로깅
      this.loggingService.addLog(clientId, "error", "에러 발생", requestState.requestId, {
        error: error.message,
      });

      // 클라이언트에 에러 응답
      requestState.client.emit("stream", {
        tempVerificationResult: [0, 0, 0, 0, 0],
        error: error.message || "Validation failed",
      });

      // 다음 요청 처리
      queue.processing = null;
      if (queue.queue.length > 0) {
        this.processNextRequest(clientId);
      }
    }
  }
}
