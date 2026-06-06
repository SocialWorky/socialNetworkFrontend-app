export interface Logs {
  logs: LogsList[];
  total: number;
  filteredTotal: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface LogsList {
  _id: string;
  level: string;
  message: string;
  context: string;
  metadata: Record<string, any> | null;
  timestamp: Date;
  resolved?: boolean;
  resolvedAt?: Date;

  userId?: string;
  source?: string;
  event?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  errorStack?: string;
}

export interface LogStats {
  total: number;
  error: number;
  warn: number;
  info: number;
  debug: number;
  bySource: {
    backend: number;
    frontend: number;
    mobile: number;
  };
}
