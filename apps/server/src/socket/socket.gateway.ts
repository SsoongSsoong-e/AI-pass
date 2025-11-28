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
import { ConfigService } from "@nestjs/config";

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

  private readonly modelServerUrl: string;

  constructor(
    private readonly configService: ConfigService,
  ) {
    // env.config.ts에서 환경에 맞는 URL 가져오기 (개발: localhost, 프로덕션: host.docker.internal)
    // 'app' 네임스페이스로 등록되어 있으므로 'app.MODEL_SERVER_URL'로 접근
    this.modelServerUrl = this.configService.get<string>('app.MODEL_SERVER_URL');
    if (!this.modelServerUrl) {
      // fallback: 환경 변수 또는 기본값
      this.modelServerUrl = process.env.MODEL_SERVER_URL || 'http://localhost:5001';
    }
    console.log(`[SocketGateway] Model Server URL: ${this.modelServerUrl}`);
  }

  // 클래스 레벨 저장소
  private requestQueues: Map<string, RequestQueue> = new Map();
  private clientMemory: Map<string, ClientMemoryState> = new Map();
  private countdownMode: Map<string, boolean> = new Map();

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
    
    // 카운트다운 모드 상태 정리
    this.countdownMode.delete(clientId);

    // 로그 저장
    console.log(`[SocketGateway] Client disconnected: ${clientId}`);
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
      console.log(`[SocketGateway] Sending request to model server: ${this.modelServerUrl}/process, imageSize: ${input.length}`);
      const response = await axios.post(
        `${this.modelServerUrl}/process`,
        {
          input: input,
        },
        {
          signal: abortSignal,
          timeout: 30000, // 30초로 증가 (모델 추론 시간 고려)
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );
      console.log(`[SocketGateway] Model server response received: ${JSON.stringify(response.data).substring(0, 100)}...`);
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
        console.error(`[SocketGateway] Request timeout to model server: ${this.modelServerUrl}/process`);
        throw new Error("Request timeout");
      }
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
        console.error(`[SocketGateway] Cannot connect to model server: ${this.modelServerUrl}/process, error: ${error.message}`);
        throw new Error(`Cannot connect to model server: ${error.message}`);
      }
      console.error(`[SocketGateway] Error fetching prediction from model server: ${error.message}`, {
        url: `${this.modelServerUrl}/process`,
        code: error.code,
        response: error.response?.data,
      });
      throw new Error(`Model inference failed: ${error.message}`);
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

    // Base64 유효성 검사 (JPEG, PNG 등 다양한 형식 지원)
    if (!imageBlob || imageBlob.length === 0) {
      console.error(`[SocketGateway] Invalid image data from client: ${clientId} - empty image`);
      client.emit("stream", { error: "Invalid image data: empty image" });
      return;
    }
    
    // Base64 문자열인지 확인 (JPEG: /9j/, PNG: iVBORw0KGgo)
    const isValidBase64 = imageBlob.startsWith("/9j/") || imageBlob.startsWith("iVBORw0KGgo");
    if (!isValidBase64) {
      console.error(`[SocketGateway] Invalid image format from client: ${clientId} - not JPEG or PNG`);
      client.emit("stream", { error: "Invalid image format: only JPEG and PNG are supported" });
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

    // 큐 가져오기 또는 생성
    const queue = this.requestQueues.get(clientId) || {
      queue: [],
      processing: null,
    };
    
    // 카운트다운 모드 체크
    const isCountdownMode = this.countdownMode.get(clientId) || false;

    if (isCountdownMode) {
      // 카운트다운 모드: 큐에 넣지 않고 바로 처리
      // 처리 중인 요청이 있으면 취소
      if (queue.processing) {
        queue.processing.abortController.abort();
        this.releaseMemory(clientId, queue.processing);
      }
      
      // 최신 포즈를 바로 처리
      queue.processing = requestState;
      this.requestQueues.set(clientId, queue);
      
      // 메모리에 Base64 저장
      this.clientMemory.set(clientId, {
        imageBlob,
        lastRequestId: requestId,
        memoryUsage: imageBlob.length,
      });
      
      console.log(`[SocketGateway] Countdown mode - Immediate processing - clientId: ${clientId}, requestId: ${requestId}`);
      
      // 즉시 처리 시작
      this.processRequestImmediately(clientId, requestState);
    } else {
      // 일반 모드: 큐에 추가
      queue.queue.push(requestState);
      this.requestQueues.set(clientId, queue);

      // 메모리에 Base64 저장
      this.clientMemory.set(clientId, {
        imageBlob,
        lastRequestId: requestId,
        memoryUsage: imageBlob.length,
      });

      // 로깅
      console.log(`[SocketGateway] Request started - clientId: ${clientId}, requestId: ${requestId}, imageSize: ${imageBlob.length}`);

      // 처리 중인 요청이 없으면 처리 시작
      if (!queue.processing) {
        this.processNextRequest(clientId);
      }
    }
  }

  /**
   * 카운트다운 모드: 요청을 즉시 처리 (큐 우회)
   */
  private async processRequestImmediately(clientId: string, requestState: RequestState): Promise<void> {
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
        // 검증 실패: 카운트다운 모드 비활성화
        this.countdownMode.set(clientId, false);
        console.log(`[SocketGateway] Countdown mode deactivated - verification failed - clientId: ${clientId}`);
      }

      requestState.verificationResult = verificationResult;

      // 메모리 해제
      this.releaseMemory(clientId, requestState);

      // 로깅
      console.log(
        `[SocketGateway] ${isSuccess ? "검증 성공" : "검증 실패"} (Countdown mode) - clientId: ${clientId}, requestId: ${requestState.requestId}, duration: ${duration}ms`,
        { verificationResult }
      );

      // 클라이언트에 결과 전송
      requestState.client.emit("stream", {
        tempVerificationResult: verificationResult,
      });

      // 처리 완료
      const queue = this.requestQueues.get(clientId);
      if (queue) {
        queue.processing = null;
      }
    } catch (error: any) {
      // 요청이 취소된 경우 무시
      if (
        error.message === "Request canceled" ||
        error.name === "AbortError" ||
        error.name === "CanceledError" ||
        error.code === "ERR_CANCELED"
      ) {
        console.log(
          `[SocketGateway] Request canceled (Countdown mode) - clientId: ${clientId}, requestId: ${requestState.requestId}`
        );
        const queue = this.requestQueues.get(clientId);
        if (queue) {
          queue.processing = null;
        }
        return;
      }

      // 실제 에러 처리
      requestState.status = "failed";
      
      // 검증 실패로 간주하여 카운트다운 모드 비활성화
      this.countdownMode.set(clientId, false);

      // 메모리 해제
      this.releaseMemory(clientId, requestState);

      // 로깅
      console.error(
        `[SocketGateway] Error occurred (Countdown mode) - clientId: ${clientId}, requestId: ${requestState.requestId}, error: ${error.message}`,
        error
      );

      // 클라이언트에 에러 응답
      requestState.client.emit("stream", {
        tempVerificationResult: [0, 0, 0, 0, 0],
        error: error.message || "Validation failed",
      });

      // 처리 완료
      const queue = this.requestQueues.get(clientId);
      if (queue) {
        queue.processing = null;
      }
    }
  }

  /**
   * 큐에서 다음 요청 처리
   **/
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
        
        // 검증 성공: 카운트다운 모드 활성화
        this.countdownMode.set(clientId, true);
        
        // 큐에 남아있는 모든 요청 취소
        queue.queue.forEach((req) => {
          req.abortController.abort();
          this.releaseMemory(clientId, req);
        });
        queue.queue = [];
        
        console.log(`[SocketGateway] Countdown mode activated - clientId: ${clientId}, requestId: ${requestState.requestId}`);
      } else {
        requestState.status = "completed-failed";
        
        // 검증 실패: 카운트다운 모드 비활성화
        this.countdownMode.set(clientId, false);
      }

      requestState.verificationResult = verificationResult;

      // 메모리 해제
      this.releaseMemory(clientId, requestState);

      // 로깅
      console.log(
        `[SocketGateway] ${isSuccess ? "검증 성공" : "검증 실패"} - clientId: ${clientId}, requestId: ${requestState.requestId}, duration: ${duration}ms`,
        { verificationResult }
      );

      // 클라이언트에 결과 전송
      requestState.client.emit("stream", {
        tempVerificationResult: verificationResult,
      });

      // 다음 요청 처리
      queue.processing = null;
      
      // 카운트다운 모드가 활성화되었으면 큐 처리를 중단
      if (this.countdownMode.get(clientId)) {
        console.log(`[SocketGateway] Queue processing stopped - countdown mode active - clientId: ${clientId}`);
        return;
      }
      
      // 일반 모드일 때만 큐에서 다음 요청 처리
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
        console.log(
          `[SocketGateway] Request canceled - clientId: ${clientId}, requestId: ${requestState.requestId}`
        );
        // 다음 요청 처리
        queue.processing = null;
        
        // 카운트다운 모드가 활성화되었으면 큐 처리를 중단
        if (this.countdownMode.get(clientId)) {
          return;
        }
        
        if (queue.queue.length > 0) {
          this.processNextRequest(clientId);
        }
        return;
      }

      // 실제 에러 처리
      requestState.status = "failed";

      // 메모리 해제
      this.releaseMemory(clientId, requestState);

      // 로깅
      console.error(
        `[SocketGateway] Error occurred - clientId: ${clientId}, requestId: ${requestState.requestId}, error: ${error.message}`,
        error
      );

      // 클라이언트에 에러 응답
      requestState.client.emit("stream", {
        tempVerificationResult: [0, 0, 0, 0, 0],
        error: error.message || "Validation failed",
      });

      // 다음 요청 처리
      queue.processing = null;
      
      // 카운트다운 모드가 활성화되었으면 큐 처리를 중단
      if (this.countdownMode.get(clientId)) {
        return;
      }
      
      if (queue.queue.length > 0) {
        this.processNextRequest(clientId);
      }
    }
  }
}
