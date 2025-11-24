import { Injectable } from '@nestjs/common';
import { RequestHistoryItem } from './interfaces/request-history-item.interface';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SocketLoggingService {
  private readonly logDir = path.join(process.cwd(), 'socket_temp');

  constructor() {
    // 로그 디렉토리 생성
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * 로그 추가
   */
  addLog(
    clientId: string,
    level: string,
    message: string,
    requestId?: string,
    data?: any,
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      clientId,
      level,
      message,
      requestId,
      data,
    };

    console.log(`[SocketLogging] ${level.toUpperCase()}: ${message}`, {
      clientId,
      requestId,
      ...data,
    });
  }

  /**
   * 히스토리 추가
   */
  addHistory(clientId: string, item: RequestHistoryItem): void {
    // 메모리 기반으로 관리 (필요시 파일 저장 가능)
    // 현재는 콘솔 로그만 출력
    console.log(`[SocketLogging] History added:`, {
      clientId,
      ...item,
    });
  }

  /**
   * 히스토리 업데이트
   */
  updateHistory(
    clientId: string,
    requestId: string,
    data: Partial<RequestHistoryItem>,
  ): void {
    console.log(`[SocketLogging] History updated:`, {
      clientId,
      requestId,
      ...data,
    });
  }

  /**
   * 클라이언트 데이터 저장
   */
  async saveClientData(clientId: string): Promise<void> {
    try {
      const filePath = path.join(this.logDir, `${clientId}.json`);
      const data = {
        clientId,
        savedAt: new Date().toISOString(),
      };

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`[SocketLogging] Client data saved: ${clientId}`);
    } catch (error) {
      console.error(`[SocketLogging] Failed to save client data: ${clientId}`, error);
    }
  }
}

