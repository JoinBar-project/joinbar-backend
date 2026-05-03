export const GEMINI_PORT = 'GEMINI_PORT';

export interface GeminiPort {
  generate(prompt: string): Promise<string>;
}
