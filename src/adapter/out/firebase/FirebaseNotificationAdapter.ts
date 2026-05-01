import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  PushNotificationPayload,
  SendNotificationPort,
  SendNotificationResult,
} from '../../../application/port/out/shared/SendNotificationPort';
import { getEnv } from '../../../infrastructure/validate-env';

@Injectable()
export class FirebaseNotificationAdapter
  implements SendNotificationPort, OnModuleInit
{
  private readonly logger = new Logger(FirebaseNotificationAdapter.name);
  private app: admin.app.App | null = null;

  onModuleInit(): void {
    const env = getEnv();
    const {
      FIREBASE_CLIENT_EMAIL: clientEmail,
      FIREBASE_PRIVATE_KEY: privateKey,
      FIREBASE_PROJECT_ID: projectId,
    } = env;

    if (!clientEmail || !privateKey || !projectId) {
      this.logger.warn('[FCM] Firebase 憑證未設定，推播功能將無法使用');
      return;
    }

    try {
      this.app = admin.initializeApp({
        credential: admin.credential.cert({
          clientEmail,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          projectId,
        }),
      });
      this.logger.log('[FCM] Firebase Admin 初始化完成');
    } catch (error) {
      this.logger.error('[FCM] Firebase Admin 初始化失敗', error);
    }
  }

  async sendPush(
    fcmToken: string,
    payload: PushNotificationPayload,
  ): Promise<SendNotificationResult> {
    if (!this.app) {
      throw new Error('Firebase Admin 未初始化');
    }

    try {
      const result = await this.app.messaging().send({
        token: fcmToken,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
      });
      return { success: true, result };
    } catch (error) {
      const code =
        error instanceof Error && 'code' in error
          ? (error as Error & { code: string }).code
          : undefined;
      const isExpired =
        code === 'messaging/invalid-registration-token' ||
        code === 'messaging/registration-token-not-registered';

      if (isExpired) return { success: false, expired: true };
      throw error;
    }
  }
}
