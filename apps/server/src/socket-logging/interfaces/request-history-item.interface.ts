export interface RequestHistoryItem {
  requestId: string;
  timestamp: number;
  status: string; // "pending" | "completed" | "failed"
  memoryUsed?: number;
  verificationResult?: number[];
  duration?: number;
  error?: string;
}

