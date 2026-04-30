import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import {
  FileStoragePort,
  GetSignedUrlOptions,
  UploadFileOptions,
} from '../../../application/port/out/shared/FileStoragePort';
import { getEnv } from '../../../infrastructure/validate-env';

const APP_NAME = 'firebase-storage';

@Injectable()
export class FirebaseStorageAdapter implements FileStoragePort, OnModuleInit {
  private readonly logger = new Logger(FirebaseStorageAdapter.name);
  private bucket: ReturnType<admin.app.App['storage']>['bucket'] extends (
    name?: string,
  ) => infer B
    ? B
    : never = null as never;
  private initialized = false;

  onModuleInit(): void {
    const env = getEnv();
    const {
      FIREBASE_CLIENT_EMAIL: clientEmail,
      FIREBASE_PRIVATE_KEY: privateKey,
      FIREBASE_PROJECT_ID: projectId,
      FIREBASE_STORAGE_BUCKET: storageBucket,
    } = env;

    if (!clientEmail || !privateKey || !projectId || !storageBucket) {
      this.logger.warn(
        '[Storage] Firebase 憑證未完整設定，檔案上傳功能將無法使用',
      );
      return;
    }

    try {
      // 使用具名 app 避免與 FirebaseNotificationAdapter（default app）衝突
      const app = admin.initializeApp(
        {
          credential: admin.credential.cert({
            clientEmail,
            privateKey: privateKey.replace(/\\n/g, '\n'),
            projectId,
          }),
          storageBucket,
        },
        APP_NAME,
      );

      this.bucket = app.storage().bucket();
      this.initialized = true;
      this.logger.log('[Storage] Firebase Storage 初始化完成');
    } catch (error) {
      this.logger.error('[Storage] Firebase Storage 初始化失敗', error);
    }
  }

  async upload(options: UploadFileOptions): Promise<void> {
    this.assertInitialized();

    const file = this.bucket.file(options.key);
    await file.save(options.buffer, { contentType: options.mimeType });
  }

  async getSignedUrl(
    key: string,
    options?: GetSignedUrlOptions,
  ): Promise<string> {
    this.assertInitialized();

    const expiresMs = Date.now() + (options?.expiresInSeconds ?? 3600) * 1000;

    let responseDisposition: string | undefined;
    if (options?.contentDisposition === 'attachment') {
      const filenamePart = options.downloadFileName
        ? `; filename*=UTF-8''${encodeURIComponent(options.downloadFileName)}`
        : '';
      responseDisposition = `attachment${filenamePart}`;
    } else if (options?.contentDisposition === 'inline') {
      responseDisposition = 'inline';
    }

    const [url] = await this.bucket.file(key).getSignedUrl({
      action: 'read',
      expires: expiresMs,
      ...(responseDisposition ? { responseDisposition } : {}),
    });

    return url;
  }

  async delete(key: string): Promise<void> {
    this.assertInitialized();
    await this.bucket.file(key).delete();
  }

  private readonly assertInitialized = (): void => {
    if (!this.initialized) {
      throw new Error('Firebase Storage 未初始化');
    }
  };
}
