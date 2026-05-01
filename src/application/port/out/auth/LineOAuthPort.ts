export interface LineUserProfile {
  /** LINE userId（provider uid） */
  uid: string;
  displayName: string | null;
  pictureUrl: string | null;
  /** email scope 有授權時才有值 */
  email: string | null;
  statusMessage: string | null;
}

export const LINE_OAUTH_PORT = 'LINE_OAUTH_PORT';

export interface LineOAuthPort {
  /**
   * authorization code を LINE token API と交換し、ユーザープロフィールを返す。
   * authorization code を LINE Token API で交換し、使用者 profile を回傳。
   * @param code - LINE authorization code
   * @param redirectUri - OAuth redirect URI
   */
  exchangeCodeForProfile(
    code: string,
    redirectUri: string,
  ): Promise<LineUserProfile>;
}
