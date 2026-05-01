export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface SendNotificationResult {
  success: boolean;
  expired?: boolean;
  result?: string;
}

export const SEND_NOTIFICATION_PORT = 'SEND_NOTIFICATION_PORT';

export interface SendNotificationPort {
  sendPush(
    fcmToken: string,
    payload: PushNotificationPayload,
  ): Promise<SendNotificationResult>;
}
