import { Injectable, OnModuleDestroy } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { LogEntry } from "./interfaces/log-entry.interface";
import { RequestHistoryItem } from "./interfaces/request-history-item.interface";

@Injectable()
export class SocketLoggingService implements OnModuleDestroy {
  private logBuffers: Map<string, LogEntry[]> = new Map();
  private clientHistory: Map<string, RequestHistoryItem[]> = new Map();
  private readonly baseDir = path.join(
    process.cwd(),
    "src",
    "socket_temp"
  );

  /**
   * 로그 엔트리 추가
   */
  addLog(
    clientId: string,
    level: LogEntry["level"],
    message: string,
    requestId?: string,
    details?: any
  ): void {
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      clientId,
      requestId,
      details,
    };

    // 버퍼에 추가
    if (!this.logBuffers.has(clientId)) {
      this.logBuffers.set(clientId, []);
    }
    this.logBuffers.get(clientId)!.push(logEntry);

    // 콘솔에도 출력
    console.log(
      `[${logEntry.timestamp}] [${level}] [${clientId}] ${message}`,
      details ? details : ""
    );
  }

  /**
   * 히스토리에 요청 추가
   */
  addHistory(clientId: string, historyItem: RequestHistoryItem): void {
    if (!this.clientHistory.has(clientId)) {
      this.clientHistory.set(clientId, []);
    }
    this.clientHistory.get(clientId)!.push(historyItem);
  }

  /**
   * 히스토리 업데이트
   */
  updateHistory(
    clientId: string,
    requestId: string,
    updates: Partial<RequestHistoryItem>
  ): void {
    const history = this.clientHistory.get(clientId);
    if (!history) return;

    const historyItem = history.find((item) => item.requestId === requestId);
    if (!historyItem) return;

    Object.assign(historyItem, updates);
  }

  /**
   * 히스토리 조회
   */
  getHistory(clientId: string): RequestHistoryItem[] | undefined {
    return this.clientHistory.get(clientId);
  }

  /**
   * 클라이언트의 로그 및 히스토리 파일 저장
   */
  async saveClientData(clientId: string): Promise<void> {
    await Promise.all([
      this.saveLogs(clientId),
      this.saveHistory(clientId),
    ]);
  }

  /**
   * 로그 파일 저장
   */
  private async saveLogs(clientId: string): Promise<void> {
    const logs = this.logBuffers.get(clientId);
    if (!logs || logs.length === 0) return;

    const logFilePath = path.join(
      this.baseDir,
      clientId,
      `logs_${clientId}_${Date.now()}.json`
    );

    await fs.promises.mkdir(path.dirname(logFilePath), { recursive: true });
    await fs.promises.writeFile(
      logFilePath,
      JSON.stringify(logs, null, 2),
      "utf8"
    );

    this.logBuffers.delete(clientId);
  }

  /**
   * 히스토리 파일 저장
   */
  private async saveHistory(clientId: string): Promise<void> {
    const history = this.clientHistory.get(clientId);
    if (!history || history.length === 0) return;

    const historyFilePath = path.join(
      this.baseDir,
      clientId,
      `history_${clientId}.json`
    );

    await fs.promises.mkdir(path.dirname(historyFilePath), { recursive: true });
    await fs.promises.writeFile(
      historyFilePath,
      JSON.stringify(history, null, 2),
      "utf8"
    );

    this.clientHistory.delete(clientId);
  }

  /**
   * 클라이언트 데이터 삭제 (메모리에서만)
   */
  clearClientData(clientId: string): void {
    this.logBuffers.delete(clientId);
    this.clientHistory.delete(clientId);
  }

  /**
   * 오래된 파일 정리
   */
  async cleanupOldFiles(maxAgeDays: number = 7): Promise<void> {
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

    try {
      const dirs = await fs.promises.readdir(this.baseDir);
      
      for (const dir of dirs) {
        const dirPath = path.join(this.baseDir, dir);
        const stats = await fs.promises.stat(dirPath);
        
        if (stats.isDirectory() && Date.now() - stats.mtime.getTime() > maxAge) {
          await fs.promises.rm(dirPath, { recursive: true });
          this.addLog("system", "info", "오래된 클라이언트 폴더 삭제", undefined, {
            clientId: dir,
            age: Math.floor((Date.now() - stats.mtime.getTime()) / (24 * 60 * 60 * 1000)),
          });
        }
      }
    } catch (error: any) {
      console.error("파일 정리 중 에러:", error.message);
    }
  }

  /**
   * 모듈 종료 시 모든 데이터 저장
   */
  async onModuleDestroy(): Promise<void> {
    const clientIds = Array.from(
      new Set([
        ...this.logBuffers.keys(),
        ...this.clientHistory.keys(),
      ])
    );

    await Promise.all(
      clientIds.map((clientId) => this.saveClientData(clientId))
    );
  }
}

