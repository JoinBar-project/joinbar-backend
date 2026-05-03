import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GeminiPort } from '../../../application/port/out/shared/GeminiPort';
import { getEnv } from '../../../infrastructure/validate-env';

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

    const model = this.client.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });
    const result = await model.generateContent(prompt);
    return result.response.text();
  }
}
