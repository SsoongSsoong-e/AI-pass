export interface LogEntry {
  timestamp: string;
  level: "info" | "error" | "warn" | "debug";
  message: string;
  clientId: string;
  requestId?: string;
  details?: any;
}

