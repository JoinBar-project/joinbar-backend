import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import {
  LineOAuthPort,
  LineUserProfile,
} from '../../../application/port/out/auth/LineOAuthPort';
import { getEnv } from '../../../infrastructure/validate-env';

interface LineTokenApiResponse {
  access_token: string;
  id_token?: string;
  expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
}

interface LineProfileApiResponse {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

/** LINE id_token の payload（email scope 付き） */
interface LineIdTokenPayload {
  sub: string;
  email?: string;
}

@Injectable()
export class LineOAuthAdapter implements LineOAuthPort {
  private readonly logger = new Logger(LineOAuthAdapter.name);

  async exchangeCodeForProfile(
    code: string,
    redirectUri: string,
  ): Promise<LineUserProfile> {
    const env = getEnv();
    if (!env.LINE_CHANNEL_ID || !env.LINE_CHANNEL_SECRET) {
      throw new UnauthorizedException(
        'LINE Login は設定されていません / LINE Login 尚未設定',
      );
    }

    // code → LINE access token
    const tokenRes = await this.exchangeToken(
      code,
      redirectUri,
      env.LINE_CHANNEL_ID,
      env.LINE_CHANNEL_SECRET,
    );

    // access token → user profile
    const profile = await this.fetchProfile(tokenRes.access_token);

    // id_token から email を取得（scope に email が含まれている場合のみ）
    const email = tokenRes.id_token
      ? this.extractEmailFromIdToken(tokenRes.id_token)
      : null;

    return {
      uid: profile.userId,
      displayName: profile.displayName ?? null,
      pictureUrl: profile.pictureUrl ?? null,
      email,
      statusMessage: profile.statusMessage ?? null,
    };
  }

  private async exchangeToken(
    code: string,
    redirectUri: string,
    channelId: string,
    channelSecret: string,
  ): Promise<LineTokenApiResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: channelId,
        client_secret: channelSecret,
      });
      const { data } = await axios.post<LineTokenApiResponse>(
        'https://api.line.me/oauth2/v2.1/token',
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
      );
      return data;
    } catch (err) {
      this.logger.warn('LINE token 交換失敗', err);
      throw new UnauthorizedException('LINE 授權碼無效或已過期');
    }
  }

  private async fetchProfile(
    accessToken: string,
  ): Promise<LineProfileApiResponse> {
    try {
      const { data } = await axios.get<LineProfileApiResponse>(
        'https://api.line.me/v2/profile',
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      return data;
    } catch (err) {
      this.logger.warn('LINE profile 取得失敗', err);
      throw new UnauthorizedException('LINE 使用者資訊取得失敗');
    }
  }

  /**
   * id_token（JWT）から email を抽出
   * 署名検証なし：HTTPS で取得した LINE API レスポンス内のトークンであり信頼済み
   */
  private extractEmailFromIdToken(idToken: string): string | null {
    try {
      if (idToken.length > 4096) return null;
      const parts = idToken.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(
        Buffer.from(parts[1], 'base64url').toString('utf8'),
      ) as LineIdTokenPayload;
      return payload.email ?? null;
    } catch {
      return null;
    }
  }
}
