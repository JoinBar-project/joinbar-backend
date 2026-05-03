import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiPort } from '../../../application/port/out/shared/GeminiPort';
import { getEnv } from '../../../infrastructure/validate-env';

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_TIMEOUT_MS = 10_000;

@Injectable()
export class GeminiAdapter implements GeminiPort, OnModuleInit {
  private readonly logger = new Logger(GeminiAdapter.name);
  private client: GoogleGenerativeAI | null = null;

  onModuleInit(): void {
    const { GEMINI_API_KEY } = getEnv();
    if (!GEMINI_API_KEY) {
      this.logger.warn('[Gemini] GEMINI_API_KEY 未設定，AI 功能將無法使用');
      return;
    }
    this.client = new GoogleGenerativeAI(GEMINI_API_KEY);
  }

  async generate(prompt: string): Promise<string> {
    if (!this.client) {
      throw new Error('Gemini client 未初始化（GEMINI_API_KEY 未設定）');
    }

    const model = this.client.getGenerativeModel({ model: GEMINI_MODEL });

    let timeoutId: ReturnType<typeof setTimeout>;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Gemini API 請求逾時')),
        GEMINI_TIMEOUT_MS,
      );
    });

    try {
      const result = await Promise.race([
        model.generateContent(prompt),
        timeoutPromise,
      ]);
      return result.response.text();
    } finally {
      clearTimeout(timeoutId!);
    }
  }
}
