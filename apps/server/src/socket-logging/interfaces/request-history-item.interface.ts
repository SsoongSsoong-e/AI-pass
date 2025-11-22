export interface RequestHistoryItem {
  requestId: string;
  timestamp: number;
  status: "pending" | "completed" | "cancelled" | "failed";
  verificationResult?: number[];
  memoryUsed?: number;
  duration?: number;
}

