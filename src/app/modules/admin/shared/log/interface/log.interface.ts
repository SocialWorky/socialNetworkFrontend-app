import { Data } from "@angular/router";

export interface Logs {
  logs: LogsList[];
  total: number;
}

export interface LogsList {
  _id: string;
  level: string;
  message: string;
  context: string;
  metadata: [];
  timestamp: Data;
}
