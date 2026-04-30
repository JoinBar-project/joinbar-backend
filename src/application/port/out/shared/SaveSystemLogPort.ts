export interface SystemLogData {
  userId?: string;
  action: string;
  ipAddress?: string;
  method?: string;
  url?: string;
  request?: string;
  response?: string;
  statusCode?: number;
  execTime?: number;
  requestTime: Date;
  responseTime: Date;
}

export const SAVE_SYSTEM_LOG_PORT = 'SAVE_SYSTEM_LOG_PORT';

export interface SaveSystemLogPort {
  saveSystemLog(data: SystemLogData): Promise<void>;
}
