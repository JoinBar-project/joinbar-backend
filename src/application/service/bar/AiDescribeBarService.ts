import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  AiDescribeBarCommand,
  AiDescribeBarResult,
  AiDescribeBarUseCase,
} from '../../port/in/bar/AiDescribeBarUseCase';
import { FIND_BAR_PORT, FindBarPort } from '../../port/out/bar/FindBarPort';
import { GEMINI_PORT, GeminiPort } from '../../port/out/shared/GeminiPort';
import { BarNotFoundException } from '../../../domain/exception/BarNotFoundException';
import { FeatureFlagService } from '../FeatureFlagService';
import { toTagNames } from './bar-tag.helper';

@Injectable()
export class AiDescribeBarService implements AiDescribeBarUseCase {
  constructor(
    @Inject(FIND_BAR_PORT) private readonly findBar: FindBarPort,
    @Inject(GEMINI_PORT) private readonly gemini: GeminiPort,
    private readonly featureFlag: FeatureFlagService,
  ) {}

  async execute(command: AiDescribeBarCommand): Promise<AiDescribeBarResult> {
    if (!this.featureFlag.isEnabled('geminiEnabled')) {
      throw new ServiceUnavailableException('AI 描述功能目前未啟用');
    }

    const bar = await this.findBar.findById(command.barId);
    if (!bar) throw new BarNotFoundException();

    const tags = toTagNames(bar.barTag);
    const prompt = this.buildPrompt(bar.name, bar.address, tags);

    try {
      const description = await this.gemini.generate(prompt);
      return { description };
    } catch {
      throw new ServiceUnavailableException('AI 描述服務暫時無法使用');
    }
  }

  private buildPrompt(
    name: string,
    address: string | null,
    tags: string[],
  ): string {
    const tagLine =
      tags.length > 0 ? `風格標籤：${tags.join('、')}` : '無特定風格標籤';
    const addressLine = address ? `地址：${address}` : '';
    return [
      `請用繁體中文為以下酒吧撰寫一段 80–120 字的吸引人介紹文字：`,
      `酒吧名稱：${name}`,
      addressLine,
      tagLine,
    ]
      .filter(Boolean)
      .join('\n');
  }
}
