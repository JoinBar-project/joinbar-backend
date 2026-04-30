export interface UploadFileOptions {
  key: string;
  buffer: Buffer;
  mimeType: string;
}

export interface GetSignedUrlOptions {
  /** 有効期限（秒）/ 有效期（秒）；預設 3600 */
  expiresInSeconds?: number;
  /** レスポンスの content-disposition / 回應的 content-disposition */
  contentDisposition?: 'inline' | 'attachment';
  /** attachment 時のダウンロードファイル名 / attachment 時的下載檔名 */
  downloadFileName?: string;
}

export const FILE_STORAGE_PORT = 'FILE_STORAGE_PORT';

export interface FileStoragePort {
  /**
   * Firebase Storage にファイルをアップロード / 上傳檔案至 Firebase Storage
   *
   * 直接 public URL を返さない。閲覧時は `getSignedUrl()` で
   * signed URL を発行する設計 /
   * 不直接回傳 public URL，瀏覽時透過 `getSignedUrl()` 取得 signed URL
   */
  upload(options: UploadFileOptions): Promise<void>;
  getSignedUrl(key: string, options?: GetSignedUrlOptions): Promise<string>;
  delete(key: string): Promise<void>;
}
